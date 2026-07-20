import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions, PermAction } from "@/hooks/usePermissions";
import { AppLoader } from "@/components/loading";

interface Props {
  module: string;
  action?: PermAction;
  children: ReactNode;
  /** Chemin de redirection si l'utilisateur n'a pas la permission. Défaut : "/" */
  redirectTo?: string;
}

/** Route guard : redirige si l'utilisateur n'a pas la permission demandée. */
export function RequirePerm({ module, action = "view", children, redirectTo = "/" }: Props) {
  const { can, loading } = usePermissions();
  if (loading) return <AppLoader label="Vérification des permissions…" />;
  if (!can(module, action)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
