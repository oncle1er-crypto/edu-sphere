import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions, PermAction } from "@/hooks/usePermissions";
import { AppLoader } from "@/components/loading";

interface Props {
  /** Un module, ou une liste de modules acceptés en OR (accès accordé dès que
   * l'un d'eux est autorisé) — utile pour les accès scindés en sous-modules
   * (ex. "finances" complet OU "finances.depenses" seul, cf. FinanceLayout). */
  module: string | string[];
  action?: PermAction;
  children: ReactNode;
  /** Chemin de redirection si l'utilisateur n'a pas la permission. Défaut : "/" */
  redirectTo?: string;
}

/** Route guard : redirige si l'utilisateur n'a pas la permission demandée. */
export function RequirePerm({ module, action = "view", children, redirectTo = "/" }: Props) {
  const { can, loading } = usePermissions();
  if (loading) return <AppLoader label="Vérification des permissions…" />;
  const modules = Array.isArray(module) ? module : [module];
  if (!modules.some((m) => can(m, action))) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
