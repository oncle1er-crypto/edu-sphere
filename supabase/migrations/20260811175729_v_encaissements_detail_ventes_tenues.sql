-- Ajoute les ventes de tenues scolaires (module dédié `sp_ventes_tenues`) à
-- v_encaissements_detail. Bug signalé le 11/08/2026 : cette table est
-- totalement autonome (aucun service_id vers sp_services, aucun trigger vers
-- sp_paiements) et n'a jamais été couverte par la vue ni par les hooks
-- financiers (useBilanComptable.ts, useEntreesRecap.ts, corrigés dans le même
-- lot) — 147 000 FCFA de ventes réelles (17 "paye" + 1 "remis") invisibles de
-- tout rapport financier. Changement strictement additif (7e branche UNION
-- ALL, même colonnes qu'avant) : n'affecte ni la RPC encaissements_du_jour ni
-- aucun autre consommateur existant.
--
-- Source distincte 'ventes_tenues' (libellé "Ventes de tenues (stock)"),
-- volontairement différenciée de la branche 'tenues' existante (numéro de
-- facture préfixé "TEN-", table `factures`/`paiements`) : deux circuits de
-- facturation des tenues coexistent dans l'application, ce ne sont pas des
-- doublons à fusionner.
--
-- Statuts exclus : 'attente' (paiement non encore reçu) et 'annule' (vente
-- annulée) — même règle que generateSpReceipt/reprint dans SpVentesTenues.tsx
-- (montantPaye forcé à 0 pour ces deux statuts). Les statuts 'paye', 'remis'
-- et 'reservation' correspondent tous à un encaissement réel dès la création
-- de la vente ; created_at reste donc la bonne date d'encaissement dans tous
-- les cas ("remis" n'est que la livraison d'une "reservation" déjà payée).
--
-- cycle_id (repli niveau, comme pour vacances/services_ponctuels) dérivé de
-- classes.cycle_id via classe_id ; eleve_id prioritaire quand renseigné.
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
     LEFT JOIN vacances_classes vc ON vc.id = vp.classe_id
UNION ALL
 SELECT v.ecole_id, v.created_at::date, 'ventes_tenues'::text, 'Ventes de tenues (stock)'::text,
    false, v.montant_total, v.mode_paiement::text, v.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, v.acheteur_libre, '—'::text), e.matricule, e.id, cl2.cycle_id
   FROM sp_ventes_tenues v
     LEFT JOIN eleves e ON e.id = v.eleve_id
     LEFT JOIN classes cl2 ON cl2.id = v.classe_id
  WHERE v.statut <> 'annule' AND v.statut <> 'attente';
