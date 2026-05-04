CREATE TABLE public.config_module_eleves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id uuid NOT NULL UNIQUE,
  format_matricule text NOT NULL DEFAULT 'ELV-{YYYY}-{####}',
  age_min_maternelle integer NOT NULL DEFAULT 3,
  age_max_lycee integer NOT NULL DEFAULT 20,
  capacite_classe_defaut integer NOT NULL DEFAULT 40,
  nb_documents_obligatoires integer NOT NULL DEFAULT 3,
  photo_obligatoire boolean NOT NULL DEFAULT true,
  notification_sms boolean NOT NULL DEFAULT true,
  generation_carnet boolean NOT NULL DEFAULT true,
  archivage_auto boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_module_eleves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.config_module_eleves
FOR SELECT TO authenticated
USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.config_module_eleves
FOR ALL TO authenticated
USING (
  has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
)
WITH CHECK (
  has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE TRIGGER update_config_module_eleves_updated_at
BEFORE UPDATE ON public.config_module_eleves
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();