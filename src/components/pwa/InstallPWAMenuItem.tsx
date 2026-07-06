import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Élément de menu qui déclenche le prompt d'installation PWA.
 * - Masqué si l'app est déjà installée (display-mode: standalone)
 * - Masqué tant que le navigateur n'a pas émis `beforeinstallprompt`
 */
export function InstallPWAMenuItem() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  return (
    <DropdownMenuItem
      onSelect={async (e) => {
        e.preventDefault();
        try {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === "accepted") setInstalled(true);
        } finally {
          setDeferred(null);
        }
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      Installer l'application
    </DropdownMenuItem>
  );
}
