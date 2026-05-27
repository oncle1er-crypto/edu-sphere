import { ReactNode } from "react";
import { usePermissions, PermAction } from "@/hooks/usePermissions";

interface CanProps {
  module: string;
  action?: PermAction;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Conditionally renders children if the current user has the given permission. */
export function Can({ module, action = "view", fallback = null, children }: CanProps) {
  const { can, loading } = usePermissions();
  if (loading) return null;
  return can(module, action) ? <>{children}</> : <>{fallback}</>;
}
