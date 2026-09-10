-- Le paiement scindé en deux moyens (migration 20260910123717) a ajouté
-- mode_paiement_2/montant_2 (ou mode_2/montant_2 pour vacances_paiements) sur
-- sp_paiements, sp_ventes_tenues et vacances_paiements — mais la vue
-- v_encaissements_detail, qui alimente les récapitulatifs de caisse
-- (useRecapCaisse.ts, useEntreesRecap.ts, useBilanComptable.ts), n'avait
-- jamais été mise à jour pour en tenir compte : elle continuait à attribuer
-- 100 % du montant au premier moyen de paiement et ignorait totalement le
-- second, faussant le comptage de caisse par moyen (espèces vs mobile money)
-- pour ces trois modules. Bug vérifié (recherche exhaustive : aucun fichier
-- src/ ne lisait mode_paiement_2/montant_2/mode_2 en dehors des écrans de
-- saisie eux-mêmes) le 10/09/2026.
--
-- Correctif : chacune de ces trois branches UNION ALL est scindée en deux —
-- une ligne pour le premier moyen (montant total moins la seconde part) et,
-- uniquement quand une seconde part existe, une ligne supplémentaire pour le
-- second moyen. La somme des deux reste égale au montant total encaissé :
-- aucun changement pour les paiements non scindés (la seconde branche ne
-- produit aucune ligne quand mode_paiement_2/mode_2 est NULL), et aucun
-- changement pour scolarité/factures/services récurrents (déjà correctement
-- répartis car chaque part y est déjà une ligne `paiements` distincte).
--
-- Corps de la vue repris intégralement de la dernière définition connue
-- (20260811175729_v_encaissements_detail_ventes_tenues.sql) — seules les 3
-- branches sp_paiements / vacances_paiements / sp_ventes_tenues changent.
CREATE OR REPLACE VIEW public.v_encaissements_detail AS
 SELECT p.ecole_id, p.date_paiement AS date_operation, 'scolarite'::text AS source,
    'Scolarité'::text AS libelle, false AS est_remise, p.montant, p.mode::text AS mode_paiement,
    p.reference, (e.nom || ' '::text) || e.prenom AS eleve, e.matricule, e.id AS eleve_id,
    NULL::uuid AS cycle_id
   FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
  WHERE p.annule_le IS NULL AND p.tranche_id IS NOT NULL AND (p.mode <> ALL (ARRAY['remise'::paiement_mode, 'bourse'::paiement_mode, 'prise_en_charge'::paiement_mode]))
UNION ALL
 SELECT p.ecole_id, p.date_paiement, 'remises'::text, 'Remises & bourses'::text, true, p.montant,
    p.mode::text, p.reference, (e.nom || ' '::text) || e.prenom, e.matricule, e.id, NULL::uuid
   FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
  WHERE p.annule_le IS NULL AND (p.mode = ANY (ARRAY['remise'::paiement_mode, 'bourse'::paiement_mode, 'prise_en_charge'::paiement_mode]))
UNION ALL
 SELECT p.ecole_id, p.date_paiement,
        CASE split_part(f.numero, '-'::text, 1)
            WHEN 'CTN'::text THEN 'cantine'::text
            WHEN 'TRP'::text THEN 'transport'::text
            WHEN 'TEN'::text THEN 'tenues'::text
            WHEN 'INS'::text THEN 'inscription'::text
            ELSE 'autres_factures'::text
        END,
        CASE split_part(f.numero, '-'::text, 1)
            WHEN 'CTN'::text THEN 'Cantine'::text
            WHEN 'TRP'::text THEN 'Transport / Car'::text
            WHEN 'TEN'::text THEN 'Tenues scolaires'::text
            WHEN 'INS'::text THEN 'Frais d''inscription'::text
            ELSE 'Autres factures'::text
        END,
    false, p.montant, p.mode::text, f.numero, (e.nom || ' '::text) || e.prenom, e.matricule, e.id,
    NULL::uuid
   FROM paiements p
     JOIN factures f ON f.id = p.facture_id
     JOIN eleves e ON e.id = p.eleve_id
  WHERE p.annule_le IS NULL
UNION ALL
 SELECT ps.ecole_id, ps.created_at::date, 'services_recurrents'::text, 'Services récurrents'::text,
    false, ps.montant, ps.mode, NULL::text, COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule,
    e.id, NULL::uuid
   FROM paiements_services ps
     LEFT JOIN echeances_services es ON es.id = ps.echeance_id
     LEFT JOIN eleves e ON e.id = es.eleve_id
-- ── Services ponctuels : 1re part (= montant_paye - montant_2 si scindé, sinon montant_paye en entier) ──
UNION ALL
 SELECT sp.ecole_id, sp.date_paiement::date, 'services_ponctuels'::text, 'Services ponctuels'::text,
    false,
    CASE WHEN sp.montant_2 IS NOT NULL THEN sp.montant_paye - sp.montant_2 ELSE sp.montant_paye END,
    sp.mode_paiement::text, sp.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule, e.id, cl.cycle_id
   FROM sp_paiements sp
     LEFT JOIN eleves e ON e.id = sp.eleve_id
     LEFT JOIN sp_candidats sc ON sc.id = sp.candidat_id
     LEFT JOIN classes cl ON cl.id = sc.classe_demandee_id
  WHERE sp.annule_le IS NULL
-- ── Services ponctuels : 2e part (uniquement si un second moyen a été saisi) ──
UNION ALL
 SELECT sp.ecole_id, sp.date_paiement::date, 'services_ponctuels'::text, 'Services ponctuels'::text,
    false, sp.montant_2, sp.mode_paiement_2::text, sp.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule, e.id, cl.cycle_id
   FROM sp_paiements sp
     LEFT JOIN eleves e ON e.id = sp.eleve_id
     LEFT JOIN sp_candidats sc ON sc.id = sp.candidat_id
     LEFT JOIN classes cl ON cl.id = sc.classe_demandee_id
  WHERE sp.annule_le IS NULL AND sp.montant_2 IS NOT NULL AND sp.mode_paiement_2 IS NOT NULL
-- ── Cours de vacances : 1re part ──
UNION ALL
 SELECT vp.ecole_id, vp.date_paiement, 'vacances'::text, 'Cours de vacances'::text,
    false,
    CASE WHEN vp.montant_2 IS NOT NULL THEN vp.montant_paye - vp.montant_2 ELSE vp.montant_paye END,
    vp.mode, NULL::text,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule, e.id, vc.cycle_id
   FROM vacances_paiements vp
     LEFT JOIN eleves e ON e.id = vp.eleve_id
     LEFT JOIN vacances_classes vc ON vc.id = vp.classe_id
-- ── Cours de vacances : 2e part ──
UNION ALL
 SELECT vp.ecole_id, vp.date_paiement, 'vacances'::text, 'Cours de vacances'::text,
    false, vp.montant_2, vp.mode_2, NULL::text,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule, e.id, vc.cycle_id
   FROM vacances_paiements vp
     LEFT JOIN eleves e ON e.id = vp.eleve_id
     LEFT JOIN vacances_classes vc ON vc.id = vp.classe_id
  WHERE vp.montant_2 IS NOT NULL AND vp.mode_2 IS NOT NULL
-- ── Ventes de tenues : 1re part ──
UNION ALL
 SELECT v.ecole_id, v.created_at::date, 'ventes_tenues'::text, 'Ventes de tenues (stock)'::text,
    false,
    CASE WHEN v.montant_2 IS NOT NULL THEN v.montant_total - v.montant_2 ELSE v.montant_total END,
    v.mode_paiement::text, v.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, v.acheteur_libre, '—'::text), e.matricule, e.id, cl2.cycle_id
   FROM sp_ventes_tenues v
     LEFT JOIN eleves e ON e.id = v.eleve_id
     LEFT JOIN classes cl2 ON cl2.id = v.classe_id
  WHERE v.statut <> 'annule' AND v.statut <> 'attente'
-- ── Ventes de tenues : 2e part ──
UNION ALL
 SELECT v.ecole_id, v.created_at::date, 'ventes_tenues'::text, 'Ventes de tenues (stock)'::text,
    false, v.montant_2, v.mode_paiement_2::text, v.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, v.acheteur_libre, '—'::text), e.matricule, e.id, cl2.cycle_id
   FROM sp_ventes_tenues v
     LEFT JOIN eleves e ON e.id = v.eleve_id
     LEFT JOIN classes cl2 ON cl2.id = v.classe_id
  WHERE v.statut <> 'annule' AND v.statut <> 'attente' AND v.montant_2 IS NOT NULL AND v.mode_paiement_2 IS NOT NULL;

ALTER VIEW public.v_encaissements_detail SET (security_invoker = on);
