import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import type { AppRole } from "./useUserPermissions";

export interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  email_confirmed?: boolean;
  created_at: string;
}

/** Payloads réellement envoyés à l'edge function admin-manage-users (voir call sites ci-dessous). */
type AdminManageUsersBody =
  | { action: "list"; ecole_id: string }
  | { action: "create"; ecole_id: string; email?: string; phone?: string; password?: string; full_name: string; roles: string[] }
  | { action: "update"; ecole_id: string; target_user_id: string; full_name?: string; email?: string }
  | { action: "delete"; ecole_id: string; target_user_id: string }
  | { action: "reset_password"; ecole_id: string; target_user_id: string; new_password: string };

export function useUsersRoles() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const call = useCallback(async <T = unknown>(body: AdminManageUsersBody): Promise<T> => {
    const { data, error } = await supabase.functions.invoke("admin-manage-users", { body });
    if (error) throw new Error(error.message);
    const errMsg = data && typeof data === "object" && "error" in data ? (data as { error?: unknown }).error : undefined;
    if (errMsg) throw new Error(String(errMsg));
    return data as T;
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    try {
      const data = await call<{ users?: UserWithRole[] }>({ action: "list", ecole_id: ecoleId });
      setUsers((data?.users ?? []) as UserWithRole[]);
    } catch (e) {
      console.error("[useUsersRoles] list error:", e);
      toast.error("Erreur chargement utilisateurs: " + messageErreurBase(e));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [ecoleId, call]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchUsers();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchUsers]);

  const addUserRole = async (userId: string, role: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId, ecole_id: ecoleId, role: role as AppRole,
    });
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Rôle attribué");
    await fetchUsers();
    return true;
  };

  const removeUserRole = async (userId: string, role: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("user_roles").delete()
      .eq("user_id", userId).eq("ecole_id", ecoleId).eq("role", role as AppRole);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Rôle retiré");
    await fetchUsers();
    return true;
  };

  const createUser = async (payload: { email?: string; phone?: string; password?: string; full_name: string; roles: string[] }): Promise<
    | { ok: true; temp_password?: string; login_identifier: string; channel: "email" | "phone"; full_name: string }
    | { ok: false }
  > => {
    if (!ecoleId) return { ok: false };
    try {
      const res = await call<{ temp_password?: string; login_identifier?: string; channel?: "email" | "phone" }>(
        { action: "create", ecole_id: ecoleId, ...payload }
      );
      if (!res?.temp_password) {
        toast.success("Utilisateur créé — il peut se connecter immédiatement");
      }
      await fetchUsers();
      return {
        ok: true,
        temp_password: res?.temp_password,
        login_identifier: res?.login_identifier ?? payload.email ?? payload.phone ?? "",
        channel: res?.channel ?? (payload.phone ? "phone" : "email"),
        full_name: payload.full_name,
      };
    } catch (e) { toast.error(messageErreurBase(e)); return { ok: false }; }
  };



  const updateUser = async (target_user_id: string, payload: { full_name?: string; email?: string }) => {
    if (!ecoleId) return false;
    try {
      await call({ action: "update", ecole_id: ecoleId, target_user_id, ...payload });
      toast.success("Utilisateur mis à jour");
      await fetchUsers();
      return true;
    } catch (e) { toast.error(messageErreurBase(e)); return false; }
  };

  const deleteUser = async (target_user_id: string) => {
    if (!ecoleId) return false;
    if (currentUser?.id === target_user_id) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte");
      return false;
    }
    try {
      await call({ action: "delete", ecole_id: ecoleId, target_user_id });
      toast.success("Utilisateur supprimé");
      await fetchUsers();
      return true;
    } catch (e) { toast.error(messageErreurBase(e)); return false; }
  };

  const resetPassword = async (target_user_id: string, new_password: string) => {
    if (!ecoleId) return false;
    try {
      await call({ action: "reset_password", ecole_id: ecoleId, target_user_id, new_password });
      toast.success("Mot de passe réinitialisé");
      return true;
    } catch (e) { toast.error(messageErreurBase(e)); return false; }
  };

  return { users, loading: loading || ecoleLoading, fetchUsers, addUserRole, removeUserRole, createUser, updateUser, deleteUser, resetPassword, ecoleId };
}
