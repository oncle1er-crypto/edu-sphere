import { Download, Check, Monitor } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePWAInstall } from "./usePWAInstall";

/**
 * Élément de menu qui déclenche le prompt d'installation PWA.
 *
 * - Masqué si l'app est déjà installée (display-mode: standalone).
 * - Masqué tant que le navigateur n'a pas émis `beforeinstallprompt`.
 * - Utilise le hook `usePWAInstall` partagé avec `InstallPWAButton`.
 */
export function InstallPWAMenuItem() {
  const { status, canInstall, install } = usePWAInstall();

  if (status === "unsupported" || status === "installed") return null;

  return (
    <DropdownMenuItem
      onSelect={async (e) => {
        e.preventDefault();
        await install();
      }}
      disabled={!canInstall}
    >
      <Download className="mr-2 h-4 w-4" />
      <span className="flex-1">
        {status === "prompting" ? "Installation en cours…" : "Installer l'application"}
      </span>
      <Monitor className="ml-2 h-3.5 w-3.5 opacity-60" />
    </DropdownMenuItem>
  );

}
