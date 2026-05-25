CREATE TABLE public.parametres_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL UNIQUE,
  format_code_classe text NOT NULL DEFAULT 'CL-{###}',
  capacite_defaut integer NOT NULL DEFAULT 40,
  effectif_min_alerte integer NOT NULL DEFAULT 15,
  heure_debut_cours time NOT NULL DEFAULT '08:00',
  heure_fin_cours time NOT NULL DEFAULT '17:00',
  duree_cours_min integer NOT NULL DEFAULT 55,
  alerte_classe_pleine boolean NOT NULL DEFAULT true,
  detection_conflits boolean NOT NULL DEFAULT true,
  cours_samedi boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parametres_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.parametres_classes FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.parametres_classes FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE TRIGGER trg_parametres_classes_updated
  BEFORE UPDATE ON public.parametres_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();