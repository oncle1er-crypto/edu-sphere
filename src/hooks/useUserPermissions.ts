import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export interface AppModule {
  key: string;
  label: string;
  ordre: number;
}

export interface PermRow {
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
}

export function useUserPermissions(targetUserId: string | null) {
  const { ecoleId } = useEcoleId();
  const [modules, setModules] = useState<AppModule[]>([]);
  const [perms, setPerms] = useState<Record<string, PermRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!targetUserId || !ecoleId) return;
    setLoading(true);
    const [{ data: mods }, { data: p }] = await Promise.all([
      supabase.from("app_modules").select("key, label, ordre").order("ordre"),
      supabase.from("user_permissions")
        .select("module_key, can_view, can_create, can_update, can_delete, can_export")
        .eq("user_id", targetUserId).eq("ecole_id", ecoleId),
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
  }, [targetUserId, ecoleId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (moduleKey: string, action: keyof Omit<PermRow, "module_key">) => {
    setPerms(prev => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] },
    }));
  };

  const setAllForModule = (moduleKey: string, value: boolean) => {
    setPerms(prev => ({
      ...prev,
      [moduleKey]: { module_key: moduleKey, can_view: value, can_create: value, can_update: value, can_delete: value, can_export: value },
    }));
  };

  const setAllForAction = (action: keyof Omit<PermRow, "module_key">, value: boolean) => {
    setPerms(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], [action]: value }; });
      return next;
    });
  };

  const buildPresetRow = (k: string, preset: "readonly" | "full" | "none"): PermRow => ({
    module_key: k,
    can_view: preset !== "none",
    can_create: preset === "full",
    can_update: preset === "full",
    can_delete: preset === "full",
    can_export: preset !== "none",
  });

  const applyPreset = (preset: "readonly" | "full" | "none", moduleKeys?: string[]) => {
    setPerms(prev => {
      const next = { ...prev };
      const keys = moduleKeys && moduleKeys.length > 0 ? moduleKeys : Object.keys(prev);
      keys.forEach(k => { if (next[k]) next[k] = buildPresetRow(k, preset); });
      return next;
    });
  };

  const setActionForModules = (action: keyof Omit<PermRow, "module_key">, value: boolean, moduleKeys: string[]) => {
    setPerms(prev => {
      const next = { ...prev };
      moduleKeys.forEach(k => { if (next[k]) next[k] = { ...next[k], [action]: value }; });
      return next;
    });
  };

  const save = async () => {
    if (!targetUserId || !ecoleId) return false;
    setSaving(true);
    try {
      const payload = Object.values(perms).map(p => ({
        module: p.module_key,
        view: p.can_view, create: p.can_create, update: p.can_update,
        delete: p.can_delete, export: p.can_export,
      }));
      const { error } = await supabase.rpc("set_user_permissions", {
        _target_user: targetUserId, _ecole_id: ecoleId, _permissions: payload as any,
      });
      if (error) throw error;
      toast.success("Permissions enregistrées");
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
      return false;
    } finally { setSaving(false); }
  };

  return { modules, perms, loading, saving, toggle, setAllForModule, setAllForAction, setActionForModules, applyPreset, save, reload: load };
}
