
CREATE OR REPLACE FUNCTION public.enregistrer_paiement(
  _ecole_id uuid,
  _eleve_id uuid,
  _tranche_id uuid,
  _montant numeric,
  _mode text,
  _reference text DEFAULT NULL,
  _recu_par uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tranche RECORD;
  v_paiement_id uuid;
  v_total_paye numeric;
  v_new_statut tranche_statut;
BEGIN
  -- Garde-fou : l'utilisateur doit appartenir à l'école et avoir un rôle adéquat
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
    RAISE EXCEPTION 'Le montant doit être strictement positif';
  END IF;

  SELECT * INTO v_tranche
  FROM public.tranches
  WHERE id = _tranche_id AND ecole_id = _ecole_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tranche introuvable';
  END IF;

  IF v_tranche.eleve_id <> _eleve_id THEN
    RAISE EXCEPTION 'Tranche / élève incohérents';
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE tranche_id = _tranche_id;

  IF v_total_paye + _montant > v_tranche.montant THEN
    RAISE EXCEPTION 'Surpaiement interdit : la tranche est déjà payée à hauteur de % FCFA sur % FCFA',
      v_total_paye, v_tranche.montant;
  END IF;

  INSERT INTO public.paiements (ecole_id, eleve_id, tranche_id, montant, mode, reference, recu_par)
  VALUES (_ecole_id, _eleve_id, _tranche_id, _montant, _mode::mode_paiement, _reference, _recu_par)
  RETURNING id INTO v_paiement_id;

  v_total_paye := v_total_paye + _montant;
  v_new_statut := CASE
    WHEN v_total_paye >= v_tranche.montant THEN 'payee'::tranche_statut
    WHEN v_total_paye > 0 THEN 'partielle'::tranche_statut
    WHEN v_tranche.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
    ELSE 'due'::tranche_statut
  END;

  UPDATE public.tranches
  SET paye = v_total_paye, statut = v_new_statut, updated_at = now()
  WHERE id = _tranche_id;

  RETURN v_paiement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_paiement(uuid, uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_paiement(uuid, uuid, uuid, numeric, text, text, uuid) TO authenticated;
