
CREATE OR REPLACE FUNCTION public.modifier_paiement(
  _paiement_id uuid,
  _montant numeric,
  _mode text,
  _reference text,
  _motif text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pai paiements%ROWTYPE;
  v_tranche tranches%ROWTYPE;
  v_autres numeric;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _montant IS NULL OR _montant <= 0 THEN
    RAISE EXCEPTION 'montant_invalide';
  END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 5 THEN
    RAISE EXCEPTION 'motif_requis';
  END IF;

  SELECT * INTO v_pai FROM paiements WHERE id = _paiement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'paiement_introuvable';
  END IF;

  IF NOT private.has_ecole_role(v_uid, v_pai.ecole_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_pai.tranche_id IS NOT NULL THEN
    SELECT * INTO v_tranche FROM tranches WHERE id = v_pai.tranche_id;
    SELECT COALESCE(SUM(montant), 0) INTO v_autres
      FROM paiements
      WHERE tranche_id = v_pai.tranche_id AND id <> v_pai.id;
    IF (v_autres + _montant) > v_tranche.montant THEN
      RAISE EXCEPTION 'montant_depasse_tranche';
    END IF;
  END IF;

  UPDATE paiements
     SET montant   = _montant,
         mode      = _mode::paiement_mode,
         reference = NULLIF(btrim(_reference), ''),
         motif     = _motif
   WHERE id = _paiement_id;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    v_pai.ecole_id,
    v_uid,
    'paiement.modifier',
    _paiement_id::text,
    'warning',
    jsonb_build_object(
      'ancien_montant', v_pai.montant,
      'nouveau_montant', _montant,
      'ancien_mode', v_pai.mode,
      'nouveau_mode', _mode,
      'ancienne_reference', v_pai.reference,
      'nouvelle_reference', _reference,
      'motif', _motif,
      'eleve_id', v_pai.eleve_id,
      'tranche_id', v_pai.tranche_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.modifier_paiement(uuid, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.modifier_paiement(uuid, numeric, text, text, text) TO authenticated;
