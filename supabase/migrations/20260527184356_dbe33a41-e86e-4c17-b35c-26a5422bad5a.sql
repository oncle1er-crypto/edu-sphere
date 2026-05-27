-- Ajout des clés étrangères manquantes sur creneaux_emploi_temps
-- pour que PostgREST puisse résoudre les jointures matieres(...), enseignants(...), etc.

ALTER TABLE public.creneaux_emploi_temps
  ADD CONSTRAINT creneaux_emploi_temps_matiere_fkey
    FOREIGN KEY (matiere_id) REFERENCES public.matieres(id) ON DELETE CASCADE,
  ADD CONSTRAINT creneaux_emploi_temps_enseignant_fkey
    FOREIGN KEY (enseignant_id) REFERENCES public.enseignants(id) ON DELETE SET NULL,
  ADD CONSTRAINT creneaux_emploi_temps_classe_fkey
    FOREIGN KEY (classe_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  ADD CONSTRAINT creneaux_emploi_temps_ecole_fkey
    FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE,
  ADD CONSTRAINT creneaux_emploi_temps_annee_fkey
    FOREIGN KEY (annee_id) REFERENCES public.annees_scolaires(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_creneaux_classe_jour
  ON public.creneaux_emploi_temps(classe_id, jour);
CREATE INDEX IF NOT EXISTS idx_creneaux_enseignant_jour
  ON public.creneaux_emploi_temps(enseignant_id, jour);