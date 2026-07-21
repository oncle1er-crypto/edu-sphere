DROP POLICY IF EXISTS cantine_regimes_read ON public.cantine_regimes;
CREATE POLICY cantine_regimes_read ON public.cantine_regimes
FOR SELECT TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'::app_role)
);