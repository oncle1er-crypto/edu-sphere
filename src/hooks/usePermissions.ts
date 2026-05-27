import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useEcoleId } from "./useEcoleId";

export type PermAction = "view" | "create" | "update" | "delete" | "export";

export interface UserPermission {
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const { ecoleId } = useEcoleId();
  const [perms, setPerms] = useState<UserPermission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !ecoleId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: roles }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("ecole_id", ecoleId),
      supabase.from("user_permissions").select("module_key, can_view, can_create, can_update, can_delete, can_export")
        .eq("user_id", user.id).eq("ecole_id", ecoleId),
    ]);
    setIsAdmin((roles ?? []).some(r => r.role === "admin"));
    setPerms((p ?? []) as UserPermission[]);
    setLoading(false);
  }, [user?.id, ecoleId]);

  useEffect(() => { load(); }, [load]);

  const can = useCallback((module: string, action: PermAction = "view") => {
    if (isAdmin) return true;
    const p = perms.find(x => x.module_key === module);
    if (!p) return false;
    const key = `can_${action}` as keyof UserPermission;
    return Boolean(p[key]);
  }, [perms, isAdmin]);

  return { perms, isAdmin, can, loading, reload: load };
}
