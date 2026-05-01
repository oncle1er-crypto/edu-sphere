
-- Revoke EXECUTE from anon on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_user_ecole_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_ecole_role(UUID, UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_ecole(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Fix search_path on update_updated_at
ALTER FUNCTION public.update_updated_at() SET search_path = public;
