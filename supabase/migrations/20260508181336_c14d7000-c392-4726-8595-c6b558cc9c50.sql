-- Per-student document requirements
CREATE TABLE public.exigences_documents_eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  type_document text NOT NULL,
  obligatoire boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, type_document)
);

CREATE INDEX idx_exig_doc_eleve ON public.exigences_documents_eleves(eleve_id);
CREATE INDEX idx_exig_doc_ecole ON public.exigences_documents_eleves(ecole_id);

ALTER TABLE public.exigences_documents_eleves ENABLE ROW LEVEL SECURITY;

CREATE POLICY ecole_read ON public.exigences_documents_eleves
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY ecole_write ON public.exigences_documents_eleves
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

CREATE TRIGGER trg_exig_doc_updated_at
  BEFORE UPDATE ON public.exigences_documents_eleves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update promotion function to honor per-student requirements
CREATE OR REPLACE FUNCTION public.check_and_promote_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classe_id uuid;
  v_statut text;
  v_paid numeric;
  v_required text[];
  v_missing int;
  v_has_custom boolean;
BEGIN
  SELECT classe_id, statut INTO v_classe_id, v_statut
  FROM public.eleves WHERE id = _eleve_id;

  IF v_statut IS DISTINCT FROM 'pre_inscrit' THEN RETURN; END IF;
  IF v_classe_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.exigences_documents_eleves WHERE eleve_id = _eleve_id
  ) INTO v_has_custom;

  IF v_has_custom THEN
    SELECT array_agg(type_document)
      INTO v_required
      FROM public.exigences_documents_eleves
     WHERE eleve_id = _eleve_id AND obligatoire = true;
  ELSE
    v_required := ARRAY['acte_naissance','photo_identite','certificat_scolarite'];
  END IF;

  IF v_required IS NOT NULL AND array_length(v_required, 1) > 0 THEN
    SELECT count(*) INTO v_missing
    FROM unnest(v_required) AS t(type_document)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.documents_eleves d
      WHERE d.eleve_id = _eleve_id AND d.type_document = t.type_document
    );
    IF v_missing > 0 THEN RETURN; END IF;
  END IF;

  SELECT COALESCE(SUM(montant_paye),0) INTO v_paid
  FROM public.factures WHERE eleve_id = _eleve_id;
  IF v_paid <= 0 THEN RETURN; END IF;

  UPDATE public.eleves SET statut = 'inscrit' WHERE id = _eleve_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_promote_eleve(uuid) FROM anon, public, authenticated;
