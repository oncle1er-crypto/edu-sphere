
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, text, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_mfa_required_for_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.consume_backup_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.register_failed_mfa() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reset_failed_mfa() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_mfa_locked(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reset_user_mfa(uuid, uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mfa_required_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_backup_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_failed_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_failed_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mfa_locked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_mfa(uuid, uuid, text) TO authenticated;
