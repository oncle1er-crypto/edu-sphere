
-- 1) eleves: narrow write access
DROP POLICY IF EXISTS "ecole_write" ON public.eleves;

CREATE POLICY "eleves_insert_staff"
  ON public.eleves FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  );

CREATE POLICY "eleves_update_staff"
  ON public.eleves FOR UPDATE
  TO authenticated
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

CREATE POLICY "eleves_delete_admin"
  ON public.eleves FOR DELETE
  TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

-- 2) sms_config: revoke column-level access to api_token from client roles
REVOKE SELECT (api_token) ON public.sms_config FROM authenticated;
REVOKE SELECT (api_token) ON public.sms_config FROM anon;
REVOKE UPDATE (api_token) ON public.sms_config FROM authenticated;
REVOKE UPDATE (api_token) ON public.sms_config FROM anon;
REVOKE INSERT (api_token) ON public.sms_config FROM authenticated;
REVOKE INSERT (api_token) ON public.sms_config FROM anon;
-- service_role retains full access (used by edge functions send-sms / send-whatsapp)
GRANT ALL ON public.sms_config TO service_role;
