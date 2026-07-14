DROP POLICY IF EXISTS cantine_regimes_read ON public.cantine_regimes;
DROP POLICY IF EXISTS cantine_regimes_write ON public.cantine_regimes;
DROP POLICY IF EXISTS visites_infirmerie_read ON public.visites_infirmerie;

CREATE POLICY cantine_regimes_read ON public.cantine_regimes
  FOR SELECT TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

CREATE POLICY cantine_regimes_write ON public.cantine_regimes
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

CREATE POLICY visites_infirmerie_read ON public.visites_infirmerie
  FOR SELECT TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );