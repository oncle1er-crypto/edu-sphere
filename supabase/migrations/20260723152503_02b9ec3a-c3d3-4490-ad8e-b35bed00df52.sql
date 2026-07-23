
-- 1. contrats_enseignants: remove teacher self-select
DROP POLICY IF EXISTS contrats_select_ecole_staff ON public.contrats_enseignants;
CREATE POLICY contrats_select_ecole_staff ON public.contrats_enseignants
FOR SELECT TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
);

-- 2. mfa_sms_otp_codes: drop client SELECT
DROP POLICY IF EXISTS "Users view own sms otp" ON public.mfa_sms_otp_codes;
CREATE POLICY mfa_sms_otp_no_client_select ON public.mfa_sms_otp_codes
FOR SELECT TO anon, authenticated
USING (false);

-- 3. parametres_notifications: explicit per-command policies
DROP POLICY IF EXISTS ecole_write ON public.parametres_notifications;

CREATE POLICY parametres_notifications_insert ON public.parametres_notifications
FOR INSERT TO authenticated
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE POLICY parametres_notifications_update ON public.parametres_notifications
FOR UPDATE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE POLICY parametres_notifications_delete ON public.parametres_notifications
FOR DELETE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);
