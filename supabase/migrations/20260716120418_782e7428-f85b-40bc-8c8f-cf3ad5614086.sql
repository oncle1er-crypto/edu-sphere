
-- ============================================================
-- parents : restreindre la lecture au personnel (pas tous les membres de l'école)
-- ============================================================
DROP POLICY IF EXISTS ecole_read ON public.parents;

CREATE POLICY parents_staff_read ON public.parents
FOR SELECT TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'::app_role)
);

-- ============================================================
-- sms_config : politiques explicites admin-only pour SELECT/INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage sms_config" ON public.sms_config;
DROP POLICY IF EXISTS sms_config_select_admin_only ON public.sms_config;

CREATE POLICY sms_config_admin_select ON public.sms_config
FOR SELECT TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));

CREATE POLICY sms_config_admin_insert ON public.sms_config
FOR INSERT TO authenticated
WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));

CREATE POLICY sms_config_admin_update ON public.sms_config
FOR UPDATE TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role))
WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));

CREATE POLICY sms_config_admin_delete ON public.sms_config
FOR DELETE TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));
