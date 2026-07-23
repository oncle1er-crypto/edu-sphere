
DROP POLICY IF EXISTS ecole_write ON public.parents;
CREATE POLICY ecole_write ON public.parents
FOR ALL TO authenticated
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

DROP POLICY IF EXISTS ecole_write ON public.abonnements_cantine;
CREATE POLICY ecole_write ON public.abonnements_cantine
FOR ALL TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::app_role)
);
