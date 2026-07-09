import { Download, Check, Monitor } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { usePWAInstall } from "./usePWAInstall";
import { cn } from "@/lib/utils";

interface InstallPWAButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Variante d'affichage */
  variant?: ButtonProps["variant"];
  /** Taille du bouton */
  size?: ButtonProps["size"];
  /** Libellé personnalisé quand l'installation est disponible */
  label?: string;
  /** Libellé personnalisé quand l'app est déjà installée */
  installedLabel?: string;
  /** Masquer le bouton si l'installation n'est pas possible */
  hideWhenUnsupported?: boolean;
}

/**
 * Bouton d'installation PWA.
 *
 * - S'affiche uniquement si le navigateur propose l'installation.
 * - Affiche un état "Installée" si l'app tourne déjà en standalone.
 * - Peut être utilisé n'importe où dans l'application.
 */
export function InstallPWAButton({
  variant = "default",
  size = "default",
  label = "Installer l'application",
  installedLabel = "Application installée",
  hideWhenUnsupported = false,
  className,
  ...props
}: InstallPWAButtonProps) {
  const { status, canInstall, install } = usePWAInstall();

  if (status === "unsupported" && hideWhenUnsupported) return null;

  const isInstalled = status === "installed";
  const isPrompting = status === "prompting";

  return (
    <Button
      variant={isInstalled ? "outline" : variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={install}
      disabled={!canInstall || isPrompting || isInstalled}
      aria-label={isInstalled ? installedLabel : label}
      {...props}
    >
      {isInstalled ? (
        <Check className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isInstalled ? installedLabel : isPrompting ? "Installation…" : label}
      </span>
      <span className="sm:hidden">
        {isInstalled ? "Installée" : isPrompting ? "…" : "Installer"}
      </span>
      <Monitor className="h-4 w-4 opacity-60 hidden sm:block" />
    </Button>
  );
}
