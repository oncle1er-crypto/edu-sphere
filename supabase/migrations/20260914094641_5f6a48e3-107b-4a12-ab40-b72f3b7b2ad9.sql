-- « Reçus & quittances » permettait de modifier le mode d'un paiement de
-- scolarité déjà enregistré (Receipts.tsx, action « Modifier le mode de
-- paiement »), mais sans jamais pouvoir le scinder en deux moyens — à la
-- différence des Services ponctuels/tenues/vacances (EditPaymentModeDialog),
-- car la scolarité ne stocke pas mode_paiement_2/montant_2 sur la ligne :
-- un règlement scindé y est représenté par DEUX lignes `paiements` distinctes
-- (même référence), exactement comme le fait déjà solder_scolarite() à la
-- création. Bug signalé par l'utilisateur le 14/09/2026, vérifié dans le code
-- (Select simple, aucun état de split, `saveEdit` ne touchait que `mode`).
--
-- Correctif : nouvelle fonction scinder_mode_paiement(), sur le même modèle
-- que modifier_paiement() (déjà existante, réservée admin) — réservée ici à
-- l'administrateur ET à la secrétaire (accès explicitement demandé) :
--   - réduit le montant de la ligne existante à la première part et lui
--     assigne le premier mode ;
--   - si une seconde part est fournie, insère une nouvelle ligne `paiements`
--     pour cette part (même élève/tranche/facture/référence/date), en tous
--     points identique à ce que produirait un nouvel encaissement scindé ;
--   - les triggers déjà en place (trg_paiements_invariants : anti-surpaiement
--     de tranche ; trg_reconcilier_tranche_paiements : recalcul de
--     tranches.paye/statut) s'appliquent automatiquement à l'UPDATE comme à
--     l'INSERT, sans changement de leur part ;
--   - journalise la correction dans audit_logs, comme modifier_paiement().
--
-- Portée volontairement limitée au mode/à la répartition : ne touche jamais
-- au montant total, au bénéficiaire, à la tranche ou à la facture d'origine.
CREATE OR REPLACE FUNCTION public.scinder_mode_paiement(
  _paiement_id uuid,
  _mode text,
  _mode_2 text DEFAULT NULL,
  _montant_2 numeric DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pai paiements%ROWTYPE;
  v_uid uuid := auth.uid();
  v_montant_1 numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_pai FROM paiements WHERE id = _paiement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'paiement_introuvable';
  END IF;

  IF NOT (
    private.has_ecole_role(v_uid, v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(v_uid, v_pai.ecole_id, 'secretaire'::app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_pai.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'paiement_annule';
  END IF;

  IF _mode IS NULL OR btrim(_mode) = '' THEN
    RAISE EXCEPTION 'mode_invalide';
  END IF;

  IF _mode_2 IS NOT NULL OR _montant_2 IS NOT NULL THEN
    IF _mode_2 IS NULL OR _montant_2 IS NULL THEN
      RAISE EXCEPTION 'split_incomplet';
    END IF;
    IF _montant_2 <= 0 THEN
      RAISE EXCEPTION 'split_montant_invalide';
    END IF;
    IF _mode_2 = _mode THEN
      RAISE EXCEPTION 'split_modes_identiques';
    END IF;
    IF _montant_2 >= v_pai.montant THEN
      RAISE EXCEPTION 'split_montant_invalide';
    END IF;
  END IF;

  v_montant_1 := v_pai.montant - COALESCE(_montant_2, 0);

  UPDATE paiements
     SET mode    = _mode::paiement_mode,
         montant = v_montant_1
   WHERE id = _paiement_id;

  IF _mode_2 IS NOT NULL AND _montant_2 IS NOT NULL THEN
    INSERT INTO paiements (ecole_id, eleve_id, tranche_id, facture_id, montant, mode, reference, date_paiement, recu_par)
    VALUES (
      v_pai.ecole_id, v_pai.eleve_id, v_pai.tranche_id, v_pai.facture_id,
      _montant_2, _mode_2::paiement_mode, v_pai.reference, v_pai.date_paiement, v_pai.recu_par
    );
  END IF;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    v_pai.ecole_id,
    v_uid,
    'paiement.scinder_mode',
    _paiement_id::text,
    'info',
    jsonb_build_object(
      'ancien_mode', v_pai.mode,
      'ancien_montant', v_pai.montant,
      'nouveau_mode', _mode,
      'nouveau_montant_1re_part', v_montant_1,
      'mode_2', _mode_2,
      'montant_2', _montant_2,
      'eleve_id', v_pai.eleve_id,
      'tranche_id', v_pai.tranche_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.scinder_mode_paiement(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scinder_mode_paiement(uuid, text, text, numeric) TO authenticated;
-- modifier_paiement()/solder_scolarite() (modèles de cette fonction) restent
-- exécutables par le rôle anon malgré leur REVOKE ALL FROM PUBLIC — Supabase
-- accorde EXECUTE à anon/authenticated directement à la création (privilèges
-- par défaut du schéma public), donc un simple REVOKE ... FROM PUBLIC ne le
-- retire pas. Repéré lors de l'application de cette migration (comparaison
-- avec sp_annuler_paiement, plus récente, qui le révoque explicitement) :
-- durcissement volontaire ici, sans impact fonctionnel puisque la fonction
-- rejette de toute façon tout appel sans auth.uid() (`not_authenticated`).
REVOKE EXECUTE ON FUNCTION public.scinder_mode_paiement(uuid, text, text, numeric) FROM anon;