import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export function useUsersRoles() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);

    // Get roles for this school
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("ecole_id", ecoleId);

    if (rolesErr) {
      console.error(rolesErr);
      toast.error("Erreur chargement rôles");
      setLoading(false);
      return;
    }

    if (!roles || roles.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Get profiles for those user_ids
    const userIds = [...new Set(roles.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    // Build combined list — group roles by user
    const userMap = new Map<string, UserWithRole>();
    for (const r of roles) {
      const profile = profileMap.get(r.user_id);
      if (userMap.has(r.user_id)) {
        // Add role
        const existing = userMap.get(r.user_id)!;
        existing.role += `, ${r.role}`;
      } else {
        userMap.set(r.user_id, {
          user_id: r.user_id,
          email: "", // will fill from auth if needed
          full_name: profile?.full_name || "Utilisateur",
          role: r.role,
          created_at: r.created_at,
        });
      }
    }

    setUsers(Array.from(userMap.values()));
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchUsers();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchUsers]);

  const addUserRole = async (userId: string, role: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      ecole_id: ecoleId,
      role: role as any,
    });
    if (error) { toast.error(error.message); return false; }
    toast.success("Rôle attribué");
    await fetchUsers();
    return true;
  };

  const removeUserRole = async (userId: string, role: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("ecole_id", ecoleId)
      .eq("role", role as any);
    if (error) { toast.error(error.message); return false; }
    toast.success("Rôle retiré");
    await fetchUsers();
    return true;
  };

  return { users, loading: loading || ecoleLoading, fetchUsers, addUserRole, removeUserRole, ecoleId };
}
