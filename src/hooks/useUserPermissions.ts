import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { ROLE_DEFAULT_MODULES } from "@/lib/roleDefaults";
import { messageErreurBase } from "@/lib/dbErrorMessages";

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

const emptyRow = (k: string): PermRow => ({
  module_key: k,
  can_view: false, can_create: false, can_update: false, can_delete: false, can_export: false,
});

const readonlyRow = (k: string): PermRow => ({
  module_key: k,
  can_view: true, can_create: false, can_update: false, can_delete: false, can_export: true,
});

const mergeRow = (a: PermRow, b: PermRow): PermRow => ({
  module_key: a.module_key,
  can_view: a.can_view || b.can_view,
  can_create: a.can_create || b.can_create,
  can_update: a.can_update || b.can_update,
  can_delete: a.can_delete || b.can_delete,
  can_export: a.can_export || b.can_export,
});

export function useUserPermissions(targetUserId: string | null) {
  const { ecoleId } = useEcoleId();
  const [modules, setModules] = useState<AppModule[]>([]);
  const [perms, setPerms] = useState<Record<string, PermRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const load = useCallback(async () => {
    if (!targetUserId || !ecoleId) return;
    setLoading(true);
    const [{ data: mods }, { data: p }, { data: roles }] = await Promise.all([
      supabase.from("app_modules").select("key, label, ordre").order("ordre"),
      supabase.from("user_permissions")
        .select("module_key, can_view, can_create, can_update, can_delete, can_export")
        .eq("user_id", targetUserId).eq("ecole_id", ecoleId),
      supabase.from("user_roles").select("role").eq("user_id", targetUserId).eq("ecole_id", ecoleId),
    ]);
    setModules((mods ?? []) as AppModule[]);
    const userRows = (p ?? []) as PermRow[];
    const usingDefaults = userRows.length === 0;

    // Si aucune permission individuelle : pré-remplir avec les permissions
    // du/des rôle(s) de l'utilisateur (union role_permissions), et sinon
    // avec les valeurs par défaut recommandées par ROLE_DEFAULT_MODULES.
    let seedFromRoles: Record<string, PermRow> = {};
    if (usingDefaults && (roles ?? []).length > 0) {
      const roleList = (roles ?? []).map((r: any) => r.role);
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("module_key, can_view, can_create, can_update, can_delete, can_export")
        .eq("ecole_id", ecoleId)
        .in("role", roleList as any);
      (rp ?? []).forEach((row: any) => {
        const existing = seedFromRoles[row.module_key];
        seedFromRoles[row.module_key] = existing ? mergeRow(existing, row) : row;
      });
      // Fallback : pour chaque rôle sans lignes en base, appliquer les défauts.
      const rolesInDb = new Set((rp ?? []).map((r: any) => r.role));
      roleList.forEach((r: string) => {
        if (rolesInDb.has(r)) return;
        (ROLE_DEFAULT_MODULES[r] ?? []).forEach(k => {
          const existing = seedFromRoles[k];
          seedFromRoles[k] = existing ? mergeRow(existing, readonlyRow(k)) : readonlyRow(k);
        });
      });
    }

    const map: Record<string, PermRow> = {};
    (mods ?? []).forEach((m: any) => {
      const existing = userRows.find(x => x.module_key === m.key);
      if (existing) map[m.key] = existing;
      else if (usingDefaults && seedFromRoles[m.key]) map[m.key] = { ...seedFromRoles[m.key], module_key: m.key };
      else map[m.key] = emptyRow(m.key);
    });
    setPerms(map);
    setIsDefault(usingDefaults);
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
      toast.error(messageErreurBase(e) ?? "Erreur");
      return false;
    } finally { setSaving(false); }
  };

  return { modules, perms, loading, saving, isDefault, toggle, setAllForModule, setAllForAction, setActionForModules, applyPreset, save, reload: load };
}
