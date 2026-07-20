import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { AppModule, PermRow } from "./useUserPermissions";

/** Permissions par défaut pour un rôle donné, à l'échelle d'une école. */
export function useRolePermissions(role: string | null) {
  const { ecoleId } = useEcoleId();
  const [modules, setModules] = useState<AppModule[]>([]);
  const [perms, setPerms] = useState<Record<string, PermRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!role || !ecoleId) return;
    setLoading(true);
    const [{ data: mods }, { data: p }] = await Promise.all([
      supabase.from("app_modules").select("key, label, ordre").order("ordre"),
      supabase.from("role_permissions")
        .select("module_key, can_view, can_create, can_update, can_delete, can_export")
        .eq("ecole_id", ecoleId).eq("role", role as any),
    ]);
    setModules((mods ?? []) as AppModule[]);
    const map: Record<string, PermRow> = {};
    (mods ?? []).forEach((m: any) => {
      const existing = (p ?? []).find((x: any) => x.module_key === m.key);
      map[m.key] = existing ?? {
        module_key: m.key,
        can_view: false, can_create: false, can_update: false, can_delete: false, can_export: false,
      };
    });
    setPerms(map);
    setLoading(false);
  }, [role, ecoleId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (moduleKey: string, action: keyof Omit<PermRow, "module_key">) => {
    setPerms(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] } }));
  };
  const setAllForModule = (moduleKey: string, value: boolean) => {
    setPerms(prev => ({
      ...prev,
      [moduleKey]: { module_key: moduleKey, can_view: value, can_create: value, can_update: value, can_delete: value, can_export: value },
    }));
  };
  const setActionForModules = (action: keyof Omit<PermRow, "module_key">, value: boolean, moduleKeys: string[]) => {
    setPerms(prev => {
      const next = { ...prev };
      moduleKeys.forEach(k => { if (next[k]) next[k] = { ...next[k], [action]: value }; });
      return next;
    });
  };
  const applyPreset = (preset: "readonly" | "full" | "none", moduleKeys?: string[]) => {
    setPerms(prev => {
      const next = { ...prev };
      const keys = moduleKeys && moduleKeys.length > 0 ? moduleKeys : Object.keys(prev);
      keys.forEach(k => {
        if (next[k]) next[k] = {
          module_key: k,
          can_view: preset !== "none",
          can_create: preset === "full",
          can_update: preset === "full",
          can_delete: preset === "full",
          can_export: preset !== "none",
        };
      });
      return next;
    });
  };

  const save = async () => {
    if (!role || !ecoleId) return false;
    setSaving(true);
    try {
      const payload = Object.values(perms).map(p => ({
        module: p.module_key,
        view: p.can_view, create: p.can_create, update: p.can_update,
        delete: p.can_delete, export: p.can_export,
      }));
      const { error } = await supabase.rpc("set_role_permissions", {
        _ecole_id: ecoleId, _role: role as any, _permissions: payload as any,
      });
      if (error) throw error;
      toast.success(`Permissions du rôle « ${role} » enregistrées`);
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
      return false;
    } finally { setSaving(false); }
  };

  return { modules, perms, loading, saving, toggle, setAllForModule, setActionForModules, applyPreset, save, reload: load };
}
