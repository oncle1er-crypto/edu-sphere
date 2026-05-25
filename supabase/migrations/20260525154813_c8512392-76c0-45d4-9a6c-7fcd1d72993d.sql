
CREATE TABLE public.groupes_pedagogiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  annee_id uuid,
  nom text NOT NULL,
  type text NOT NULL DEFAULT 'option',
  enseignant_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.groupe_membres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id uuid NOT NULL REFERENCES public.groupes_pedagogiques(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL,
  ecole_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(groupe_id, eleve_id)
);

ALTER TABLE public.groupes_pedagogiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupe_membres ENABLE ROW LEVEL SECURITY;

CREATE POLICY ecole_read ON public.groupes_pedagogiques FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY ecole_write ON public.groupes_pedagogiques FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE POLICY ecole_read ON public.groupe_membres FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY ecole_write ON public.groupe_membres FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE TRIGGER groupes_pedagogiques_updated_at BEFORE UPDATE ON public.groupes_pedagogiques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
