CREATE TABLE public.modeles_exigences_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  nom text NOT NULL,
  description text,
  est_defaut boolean NOT NULL DEFAULT false,
  types_obligatoires text[] NOT NULL DEFAULT '{}',
  types_optionnels text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_modeles_exig_ecole ON public.modeles_exigences_documents(ecole_id);

ALTER TABLE public.modeles_exigences_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ecole_read ON public.modeles_exigences_documents
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY ecole_write ON public.modeles_exigences_documents
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

CREATE TRIGGER trg_modeles_exig_updated_at
  BEFORE UPDATE ON public.modeles_exigences_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
