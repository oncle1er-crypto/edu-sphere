DROP POLICY IF EXISTS ecole_write ON public.notifications_parents;
DROP POLICY IF EXISTS notifications_parents_select ON public.notifications_parents;

CREATE POLICY notifications_parents_write ON public.notifications_parents
FOR ALL TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);

CREATE POLICY notifications_parents_select ON public.notifications_parents
FOR SELECT TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);