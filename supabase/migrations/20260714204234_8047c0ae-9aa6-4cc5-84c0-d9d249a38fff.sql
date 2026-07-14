
-- Restrict bibliotheque_acquisitions to finance/admin roles
DROP POLICY IF EXISTS bibliotheque_acquisitions_ecole ON public.bibliotheque_acquisitions;
CREATE POLICY bibliotheque_acquisitions_access ON public.bibliotheque_acquisitions
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- Restrict cantine_personnel PII to admin/directeur/secretaire (HR)
DROP POLICY IF EXISTS cantine_personnel_ecole ON public.cantine_personnel;
CREATE POLICY cantine_personnel_access ON public.cantine_personnel
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

-- Restrict enseignants_candidatures (HR data) to admin/directeur/secretaire
DROP POLICY IF EXISTS enseignants_candidatures_ecole ON public.enseignants_candidatures;
CREATE POLICY enseignants_candidatures_access ON public.enseignants_candidatures
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

-- Restrict enseignants_evaluations (performance reviews) to management only
DROP POLICY IF EXISTS enseignants_evaluations_ecole ON public.enseignants_evaluations;
CREATE POLICY enseignants_evaluations_access ON public.enseignants_evaluations
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

-- Extend visites_infirmerie write access to secretaire (matches read policy)
DROP POLICY IF EXISTS ecole_write ON public.visites_infirmerie;
CREATE POLICY visites_infirmerie_write ON public.visites_infirmerie
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
