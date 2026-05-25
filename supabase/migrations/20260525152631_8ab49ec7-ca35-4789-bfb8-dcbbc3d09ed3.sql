ALTER TABLE public.factures
  ADD CONSTRAINT factures_eleve_id_fkey FOREIGN KEY (eleve_id) REFERENCES public.eleves(id) ON DELETE CASCADE,
  ADD CONSTRAINT factures_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE,
  ADD CONSTRAINT factures_annee_id_fkey FOREIGN KEY (annee_id) REFERENCES public.annees_scolaires(id) ON DELETE CASCADE;