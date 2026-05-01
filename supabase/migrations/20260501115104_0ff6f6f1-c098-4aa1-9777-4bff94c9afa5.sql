ALTER TABLE public.classes
  ADD CONSTRAINT classes_prof_principal_id_fkey 
  FOREIGN KEY (professeur_principal_id) REFERENCES public.enseignants(id) ON DELETE SET NULL;