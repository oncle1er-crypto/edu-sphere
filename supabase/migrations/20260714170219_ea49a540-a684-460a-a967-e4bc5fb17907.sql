
-- cantine_regimes: restrict to health/admin staff
DROP POLICY IF EXISTS cantine_regimes_ecole ON public.cantine_regimes;

CREATE POLICY cantine_regimes_read ON public.cantine_regimes
  FOR SELECT USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

CREATE POLICY cantine_regimes_write ON public.cantine_regimes
  FOR ALL USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  ) WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

-- visites_infirmerie: restrict SELECT to health/admin staff
DROP POLICY IF EXISTS ecole_read ON public.visites_infirmerie;

CREATE POLICY visites_infirmerie_read ON public.visites_infirmerie
  FOR SELECT USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );
