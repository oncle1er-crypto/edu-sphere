
ALTER TABLE public.matieres
  ADD COLUMN IF NOT EXISTS coefficient numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS note_sur integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS note_passage numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cycles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS couleur text NOT NULL DEFAULT 'bg-primary',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.parametres_matieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL UNIQUE,
  echelle_defaut integer NOT NULL DEFAULT 20,
  note_passage_defaut numeric NOT NULL DEFAULT 10,
  coefficient_defaut numeric NOT NULL DEFAULT 1,
  matieres_optionnelles boolean NOT NULL DEFAULT true,
  education_religieuse boolean NOT NULL DEFAULT true,
  afficher_code_bulletin boolean NOT NULL DEFAULT true,
  verrouiller_coefficients boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parametres_matieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.parametres_matieres FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.parametres_matieres FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));
CREATE TRIGGER trg_param_matieres_updated BEFORE UPDATE ON public.parametres_matieres
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.progressions_matiere (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  matiere_id uuid NOT NULL,
  classe_id uuid,
  periode text NOT NULL DEFAULT 'T1',
  chapitres_total integer NOT NULL DEFAULT 0,
  chapitres_faits integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.progressions_matiere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.progressions_matiere FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.progressions_matiere FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role));
CREATE TRIGGER trg_progressions_matiere_updated BEFORE UPDATE ON public.progressions_matiere
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
