DROP POLICY IF EXISTS modules_read_all ON public.app_modules;
REVOKE SELECT ON public.app_modules FROM anon;
CREATE POLICY modules_read_authenticated ON public.app_modules
  FOR SELECT TO authenticated USING (true);