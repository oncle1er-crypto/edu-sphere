
-- 1) Restrict parametres_sigfne policies to authenticated role
DROP POLICY IF EXISTS sigfne_read ON public.parametres_sigfne;
DROP POLICY IF EXISTS sigfne_write ON public.parametres_sigfne;

CREATE POLICY sigfne_read ON public.parametres_sigfne
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY sigfne_write ON public.parametres_sigfne
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

-- 2) Prevent any API select of the raw sms_config.api_token column.
--    Writes (INSERT/UPDATE) remain permitted so admins can store new tokens.
REVOKE SELECT (api_token) ON public.sms_config FROM authenticated, anon, PUBLIC;
