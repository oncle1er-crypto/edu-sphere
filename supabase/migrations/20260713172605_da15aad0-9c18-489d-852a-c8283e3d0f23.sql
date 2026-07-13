DROP POLICY IF EXISTS ecole_write ON public.eleves;
CREATE POLICY ecole_write ON public.eleves
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role));