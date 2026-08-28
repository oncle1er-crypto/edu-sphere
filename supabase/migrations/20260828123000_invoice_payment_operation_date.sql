-- La date choisie lors de l'encaissement doit être conservée en base afin que
-- toute réimpression reproduise le paiement d'origine.
DROP FUNCTION IF EXISTS public.enregistrer_paiement_facture(uuid, numeric, text, text, uuid);

CREATE FUNCTION public.enregistrer_paiement_facture(
  _facture_id uuid,
  _montant numeric,
  _mode text DEFAULT 'especes',
  _reference text DEFAULT NULL,
  _recu_par uuid DEFAULT NULL,
  _date_paiement date DEFAULT CURRENT_DATE
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_facture RECORD;
  v_paiement_id uuid;
  v_new_paye numeric;
  v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  SELECT * INTO v_facture
  FROM public.factures
  WHERE id = _facture_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'Accès refusé : rôle admin, directeur ou comptable requis'; END IF;

  IF _montant IS NULL OR _montant <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF _montant > (v_facture.montant - v_facture.montant_paye) THEN
    RAISE EXCEPTION 'Le montant dépasse le reste dû (%)', (v_facture.montant - v_facture.montant_paye);
  END IF;

  IF _reference IS NULL OR length(btrim(_reference)) = 0 THEN
    _reference := 'REC-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
  END IF;

  INSERT INTO public.paiements (
    ecole_id, eleve_id, tranche_id, facture_id, montant, mode, reference,
    recu_par, date_paiement, notes
  ) VALUES (
    v_facture.ecole_id, v_facture.eleve_id, NULL, v_facture.id, _montant,
    _mode::paiement_mode, _reference, _recu_par, coalesce(_date_paiement, CURRENT_DATE),
    'Facture ' || v_facture.numero || ' — ' || v_facture.libelle
  ) RETURNING id INTO v_paiement_id;

  v_new_paye := v_facture.montant_paye + _montant;
  v_new_statut := CASE
    WHEN v_new_paye >= v_facture.montant THEN 'payee'
    WHEN v_new_paye > 0 THEN 'partielle'
    ELSE v_facture.statut
  END;

  UPDATE public.factures
  SET montant_paye = v_new_paye,
      statut = v_new_statut,
      updated_at = now()
  WHERE id = _facture_id;

  RETURN v_paiement_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.enregistrer_paiement_facture(uuid, numeric, text, text, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_paiement_facture(uuid, numeric, text, text, uuid, date) TO authenticated;
