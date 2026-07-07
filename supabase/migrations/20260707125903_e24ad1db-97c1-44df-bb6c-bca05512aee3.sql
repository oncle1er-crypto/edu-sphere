CREATE OR REPLACE FUNCTION public.check_and_promote_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_classe_id uuid;
  v_statut text;
  v_paid numeric;
  v_required text[];
  v_missing int;
BEGIN
  SELECT classe_id, statut INTO v_classe_id, v_statut
  FROM public.eleves WHERE id = _eleve_id;

  IF v_statut IS DISTINCT FROM 'pre_inscrit' THEN RETURN; END IF;
  IF v_classe_id IS NULL THEN RETURN; END IF;

  -- Documents : uniquement si l'école a explicitement défini des exigences
  -- marquées obligatoires pour cet élève. Sinon, aucun document n'est requis.
  SELECT array_agg(type_document)
    INTO v_required
    FROM public.exigences_documents_eleves
   WHERE eleve_id = _eleve_id AND obligatoire = true;

  IF v_required IS NOT NULL AND array_length(v_required, 1) > 0 THEN
    SELECT count(*) INTO v_missing
    FROM unnest(v_required) AS t(type_document)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.documents_eleves d
      WHERE d.eleve_id = _eleve_id AND d.type_document = t.type_document
    );
    IF v_missing > 0 THEN RETURN; END IF;
  END IF;

  -- Au moins un paiement enregistré
  SELECT COALESCE(SUM(montant_paye),0) INTO v_paid
  FROM public.factures WHERE eleve_id = _eleve_id;
  IF v_paid <= 0 THEN RETURN; END IF;

  UPDATE public.eleves SET statut = 'inscrit' WHERE id = _eleve_id;
END;
$function$;