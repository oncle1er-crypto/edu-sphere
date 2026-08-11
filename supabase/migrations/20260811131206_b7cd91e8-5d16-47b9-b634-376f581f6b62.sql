-- 1. cantine_regimes: restrict medical/allergen read to admin/directeur/secretaire
DROP POLICY IF EXISTS cantine_regimes_read ON public.cantine_regimes;
CREATE POLICY cantine_regimes_read ON public.cantine_regimes
FOR SELECT TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
);

-- 2. parents: split broad ALL policy, restrict DELETE to admin/directeur
DROP POLICY IF EXISTS ecole_write ON public.parents;

CREATE POLICY parents_staff_insert ON public.parents
FOR INSERT TO authenticated
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);

CREATE POLICY parents_staff_update ON public.parents
FOR UPDATE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);

CREATE POLICY parents_admin_delete ON public.parents
FOR DELETE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);