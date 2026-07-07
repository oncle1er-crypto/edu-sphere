ALTER TABLE public.eleves DROP CONSTRAINT IF EXISTS eleves_ecole_id_matricule_key;
ALTER TABLE public.eleves ADD CONSTRAINT eleves_ecole_annee_matricule_key UNIQUE (ecole_id, annee_id, matricule);