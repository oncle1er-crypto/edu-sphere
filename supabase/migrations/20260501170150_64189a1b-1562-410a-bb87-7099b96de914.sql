
CREATE TABLE public.creneaux_emploi_temps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  annee_id UUID NOT NULL,
  classe_id UUID NOT NULL,
  matiere_id UUID NOT NULL,
  enseignant_id UUID,
  jour INTEGER NOT NULL CHECK (jour >= 1 AND jour <= 6),
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  salle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creneaux_emploi_temps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.creneaux_emploi_temps
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.creneaux_emploi_temps
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE INDEX idx_creneaux_classe_jour ON public.creneaux_emploi_temps (ecole_id, classe_id, jour);
CREATE INDEX idx_creneaux_enseignant ON public.creneaux_emploi_temps (ecole_id, enseignant_id, jour);
