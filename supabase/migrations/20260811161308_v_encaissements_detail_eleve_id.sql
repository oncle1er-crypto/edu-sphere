-- Expose eleve_id (+ cycle_id de repli) dans v_encaissements_detail pour
-- permettre le filtrage côté client par niveau, utilisé par le nouveau
-- Récapitulatif de caisse (jour/semaine/date choisie, avec ou sans détail,
-- filtré par niveau). Changement strictement additif (nouvelles colonnes en
-- fin de liste) : n'affecte ni la RPC encaissements_du_jour ni aucun autre
-- consommateur existant de cette vue.
--
-- cycle_id ne sert que de repli pour les 2 sources où eleve_id ne suffit pas :
--   - vacances : vacances_paiements.eleve_id référence vacances_eleves (pas
--     eleves) — même quirk déjà documenté et corrigé dans useBilanComptable.ts
--     via vacances_classes.cycle_id.
--   - services_ponctuels réservés par un candidat (pas encore élève) : on
--     retombe sur sp_candidats.classe_demandee_id -> classes.cycle_id, comme
--     dans useBilanComptable.ts.
-- Pour toutes les autres sources, eleve_id est toujours renseigné et cycle_id
-- reste NULL (non utilisé).
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
UNION ALL
 SELECT sp.ecole_id, sp.date_paiement::date, 'services_ponctuels'::text, 'Services ponctuels'::text,
    false, sp.montant_paye, sp.mode_paiement::text, sp.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule, e.id, cl.cycle_id
   FROM sp_paiements sp
     LEFT JOIN eleves e ON e.id = sp.eleve_id
     LEFT JOIN sp_candidats sc ON sc.id = sp.candidat_id
     LEFT JOIN classes cl ON cl.id = sc.classe_demandee_id
  WHERE sp.annule_le IS NULL
UNION ALL
 SELECT vp.ecole_id, vp.date_paiement, 'vacances'::text, 'Cours de vacances'::text,
    false, vp.montant_paye, vp.mode, NULL::text,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule, e.id, vc.cycle_id
   FROM vacances_paiements vp
     LEFT JOIN eleves e ON e.id = vp.eleve_id
     LEFT JOIN vacances_classes vc ON vc.id = vp.classe_id;
