DROP POLICY IF EXISTS "ecole_write" ON public.eleve_parents;

CREATE POLICY "ecole_write" ON public.eleve_parents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.eleves e
    WHERE e.id = eleve_parents.eleve_id
      AND (
        private.has_ecole_role(auth.uid(), e.ecole_id, 'admin'::app_role)
        OR private.has_ecole_role(auth.uid(), e.ecole_id, 'directeur'::app_role)
        OR private.has_ecole_role(auth.uid(), e.ecole_id, 'secretaire'::app_role)
        OR private.has_ecole_role(auth.uid(), e.ecole_id, 'comptable'::app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eleves e
    WHERE e.id = eleve_parents.eleve_id
      AND (
        private.has_ecole_role(auth.uid(), e.ecole_id, 'admin'::app_role)
        OR private.has_ecole_role(auth.uid(), e.ecole_id, 'directeur'::app_role)
        OR private.has_ecole_role(auth.uid(), e.ecole_id, 'secretaire'::app_role)
        OR private.has_ecole_role(auth.uid(), e.ecole_id, 'comptable'::app_role)
      )
  )
);