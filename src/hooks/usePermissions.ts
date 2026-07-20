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

/**
 * Retourne les permissions EFFECTIVES de l'utilisateur courant pour l'école courante
 * (union des permissions du/des rôle(s) via `role_permissions` et des overrides
 * individuels via `user_permissions`). L'admin bypass tout.
 */
export function usePermissions() {
  const { user } = useAuth();
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [perms, setPerms] = useState<UserPermission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Attendre que l'école soit hydratée : sinon RequirePerm voit loading=false
    // avec perms=[] et redirige vers "/" avant même que la RPC ne s'exécute.
    if (ecoleLoading) { setLoading(true); return; }
    if (!user?.id || !ecoleId) { setPerms([]); setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    const [{ data: roles }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("ecole_id", ecoleId),
      supabase.rpc("get_effective_permissions", { _user_id: user.id, _ecole_id: ecoleId }),
    ]);
    setIsAdmin((roles ?? []).some(r => r.role === "admin"));
    setPerms((p ?? []) as UserPermission[]);
    setLoading(false);
  }, [user?.id, ecoleId, ecoleLoading]);

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
