
-- Revoke all default EXECUTE permissions from public (which includes anon)
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_ecole(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_ecole_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_ecole_role(uuid, uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_creneau_overlap(uuid, uuid, uuid, uuid, integer, time, time, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid, uuid) FROM PUBLIC, anon;

-- Trigger functions: revoke from everyone via API (they are called by triggers, not users)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- Grant EXECUTE to authenticated for business functions
GRANT EXECUTE ON FUNCTION public.user_belongs_to_ecole(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_ecole_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_ecole_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_creneau_overlap(uuid, uuid, uuid, uuid, integer, time, time, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid, uuid) TO authenticated;
