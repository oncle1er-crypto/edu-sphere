
-- 1. Corriger check_and_promote_eleve : lire les paiements réels (cash uniquement)
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

  -- Documents obligatoires (si définis)
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

  -- Au moins un encaissement réel (hors remises/bourses/prises en charge)
  SELECT COALESCE(SUM(p.montant), 0) INTO v_paid
  FROM public.paiements p
  WHERE p.eleve_id = _eleve_id
    AND (p.mode IS NULL OR p.mode NOT IN ('remise','bourse','prise_en_charge'));

  IF v_paid <= 0 THEN RETURN; END IF;

  UPDATE public.eleves SET statut = 'inscrit' WHERE id = _eleve_id;
END;
$function$;

-- 2. Trigger de promotion sur paiements
CREATE OR REPLACE FUNCTION public.trg_promote_on_paiement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.eleve_id IS NOT NULL THEN
    PERFORM public.check_and_promote_eleve(NEW.eleve_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_eleve_on_paiement ON public.paiements;
CREATE TRIGGER promote_eleve_on_paiement
AFTER INSERT ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.trg_promote_on_paiement();

-- 3. Rattrapage rétroactif
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT e.id FROM public.eleves e
    WHERE e.statut = 'pre_inscrit'
      AND EXISTS (SELECT 1 FROM public.paiements p WHERE p.eleve_id = e.id)
  LOOP
    PERFORM public.check_and_promote_eleve(r.id);
  END LOOP;
END $$;
