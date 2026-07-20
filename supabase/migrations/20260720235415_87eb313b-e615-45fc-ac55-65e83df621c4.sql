
-- cantine_regimes: add explicit INSERT/UPDATE/DELETE policies
CREATE POLICY "cantine_regimes_insert" ON public.cantine_regimes
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

CREATE POLICY "cantine_regimes_update" ON public.cantine_regimes
  FOR UPDATE TO authenticated
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

CREATE POLICY "cantine_regimes_delete" ON public.cantine_regimes
  FOR DELETE TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

-- mfa_sms_otp_codes: deny end-user INSERT/UPDATE explicitly.
-- OTP codes are minted server-side (edge functions using service_role, which bypasses RLS).
CREATE POLICY "mfa_sms_otp_no_client_insert" ON public.mfa_sms_otp_codes
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "mfa_sms_otp_no_client_update" ON public.mfa_sms_otp_codes
  FOR UPDATE TO authenticated, anon
  USING (false)
  WITH CHECK (false);
