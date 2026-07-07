-- audit_logs: require user_id = auth.uid() in addition to ecole membership
DROP POLICY IF EXISTS "auth_insert" ON public.audit_logs;
CREATE POLICY "auth_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND private.user_belongs_to_ecole(auth.uid(), ecole_id)
  );

-- security_audit_logs: strictly enforce user_id = auth.uid() on insert
DROP POLICY IF EXISTS "Authenticated insert security logs" ON public.security_audit_logs;
CREATE POLICY "Authenticated insert security logs" ON public.security_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());