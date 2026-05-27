CREATE TABLE public.disponibilites_enseignants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  jour SMALLINT NOT NULL CHECK (jour BETWEEN 1 AND 7),
  plage TEXT NOT NULL CHECK (plage IN ('matin','apres_midi')),
  disponible BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enseignant_id, jour, plage)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disponibilites_enseignants TO authenticated;
GRANT ALL ON public.disponibilites_enseignants TO service_role;

ALTER TABLE public.disponibilites_enseignants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispo_read" ON public.disponibilites_enseignants FOR SELECT TO authenticated
USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "dispo_write" ON public.disponibilites_enseignants FOR ALL TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE INDEX idx_dispo_ens ON public.disponibilites_enseignants(enseignant_id);
CREATE INDEX idx_dispo_ecole ON public.disponibilites_enseignants(ecole_id);

CREATE TRIGGER trg_dispo_updated_at
BEFORE UPDATE ON public.disponibilites_enseignants
FOR EACH ROW EXECUTE FUNCTION public.tg_salles_set_updated_at();
