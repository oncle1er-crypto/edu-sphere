import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
 * Logique pure de résolution d'une permission effective : admin bypass tout,
 * sinon recherche du module dans la liste de permissions et lecture du champ
 * `can_<action>`. Extraite de usePermissions() pour être testable sans mock
 * Supabase/Auth (voir usePermissions.test.ts).
 */
export function computeCan(
  perms: UserPermission[],
  isAdmin: boolean,
  module: string,
  action: PermAction = "view"
): boolean {
  if (isAdmin) return true;
  const p = perms.find((x) => x.module_key === module);
  if (!p) return false;
  const key = `can_${action}` as keyof UserPermission;
  return Boolean(p[key]);
}

/**
 * Retourne les permissions EFFECTIVES de l'utilisateur courant pour l'école courante
 * (union des permissions du/des rôle(s) via `role_permissions` et des overrides
 * individuels via `user_permissions`). L'admin bypass tout.
 */
export function usePermissions() {
  const { user } = useAuth();
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const queryClient = useQueryClient();

  // Les permissions sont mises en cache et PARTAGÉES par toute l'application :
  // chaque garde de route (RequirePerm) et chaque layout réutilise le même
  // résultat au lieu de relancer les requêtes à chaque changement de page —
  // sinon l'écran « Vérification des permissions… » remplaçait la page à
  // chaque clic du menu latéral, donnant l'impression d'un double clic requis.
  const enabled = !ecoleLoading && !!user?.id && !!ecoleId;

  const { data, isPending } = useQuery({
    queryKey: ["effective-permissions", user?.id ?? null, ecoleId ?? null],
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [{ data: roles }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("ecole_id", ecoleId!),
        supabase.rpc("get_effective_permissions", { _user_id: user!.id, _ecole_id: ecoleId! }),
      ]);
      return {
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
        perms: (p ?? []) as UserPermission[],
      };
    },
  });

  const perms = data?.perms ?? [];
  const isAdmin = data?.isAdmin ?? false;

  // Utilisateur/école non résolus : on reste en chargement (comportement
  // historique) pour éviter une redirection prématurée vers "/".
  const loading = enabled ? isPending : ecoleLoading;

  const can = useCallback(
    (module: string, action: PermAction = "view") => computeCan(perms, isAdmin, module, action),
    [perms, isAdmin]
  );

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["effective-permissions", user?.id ?? null, ecoleId ?? null],
    });
  }, [queryClient, user?.id, ecoleId]);

  return { perms, isAdmin, can, loading, reload };
}
