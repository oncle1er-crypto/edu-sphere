-- Corrige appliquer_remise() : le calcul du total déjà payé sur la tranche
-- (utilisé pour refuser une remise qui dépasserait le reste dû) incluait à
-- tort les paiements annulés (annule_le IS NOT NULL), contrairement à
-- reconcilier_tranche_paiements() (corrigé le 10/08/2026, voir migration
-- 20260810095845) et au trigger trg_paiements_invariants (déjà correct).
--
-- Conséquence concrète du bug : après l'annulation d'un paiement sur une
-- tranche, une remise pourtant légitime peut être refusée à tort, car le
-- total utilisé pour la comparaison au reste dû reste gonflé du montant
-- annulé. Découvert en écrivant tests/e2e/supabase/paiements-rpc.spec.ts.
--
-- Aucun risque de sur-paiement lié à ce bug : trg_paiements_invariants (qui,
-- lui, exclut déjà les annulés) constitue le véritable garde-fou empêchant
-- tout dépassement réel du montant de la tranche.
CREATE OR REPLACE FUNCTION public.appliquer_remise(
  _ecole_id uuid,
  _eleve_id uuid,
  _tranche_id uuid,
  _montant numeric,
  _type_remise text,
  _motif text,
  _accorde_par uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tranche RECORD;
  v_paiement_id uuid;
  v_total numeric;
  v_new_statut tranche_statut;
  v_mode paiement_mode;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle insuffisant pour cette école';
  END IF;

  IF _montant IS NULL OR _montant <= 0 THEN
    RAISE EXCEPTION 'Le montant de la remise doit être strictement positif';
  END IF;

  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Le motif est obligatoire (3 caractères minimum)';
  END IF;

  v_mode := CASE lower(_type_remise)
    WHEN 'bourse' THEN 'bourse'::paiement_mode
    WHEN 'prise_en_charge' THEN 'prise_en_charge'::paiement_mode
    ELSE 'remise'::paiement_mode
  END;

  SELECT * INTO v_tranche
  FROM public.tranches
  WHERE id = _tranche_id AND ecole_id = _ecole_id AND eleve_id = _eleve_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tranche introuvable';
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total
  FROM public.paiements
  WHERE tranche_id = _tranche_id
    AND annule_le IS NULL; -- correction : exclure les paiements annulés

  IF v_total + _montant > v_tranche.montant THEN
    RAISE EXCEPTION 'Remise refusée : dépasse le reste dû (% / %).', v_total, v_tranche.montant;
  END IF;

  INSERT INTO public.paiements (ecole_id, eleve_id, tranche_id, montant, mode, reference, motif, recu_par)
  VALUES (_ecole_id, _eleve_id, _tranche_id, _montant, v_mode, _type_remise, _motif, COALESCE(_accorde_par, auth.uid()))
  RETURNING id INTO v_paiement_id;

  v_total := v_total + _montant;
  v_new_statut := CASE
    WHEN v_total >= v_tranche.montant THEN 'payee'::tranche_statut
    WHEN v_total > 0 THEN 'partielle'::tranche_statut
    WHEN v_tranche.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
    ELSE 'due'::tranche_statut
  END;

  UPDATE public.tranches
  SET paye = v_total, statut = v_new_statut, updated_at = now()
  WHERE id = _tranche_id;

  RETURN v_paiement_id;
END;
$function$;
