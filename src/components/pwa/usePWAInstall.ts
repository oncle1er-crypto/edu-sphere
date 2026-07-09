import { useEffect, useState, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallStatus = "unsupported" | "installed" | "available" | "prompting";

interface UsePWAInstallReturn {
  /** État courant de l'installation PWA */
  status: InstallStatus;
  /** Vrai si le navigateur peut afficher le prompt natif d'installation */
  canInstall: boolean;
  /** Déclenche le prompt d'installation natif */
  install: () => Promise<void>;
}

/**
 * Hook réutilisable pour gérer l'installation PWA.
 *
 * - Détecte si l'application est déjà installée (display-mode: standalone).
 * - Capture l'événement `beforeinstallprompt` pour permettre un bouton personnalisé.
 * - Fournit un état explicite pour adapter l'UI.
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<InstallStatus>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setStatus("installed");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setStatus("available");
    };

    const onInstalled = () => {
      setStatus("installed");
      setDeferred(null);
    };

    // Si l'événement a déjà été émis avant le montage du composant, il n'est
    // plus disponible. On considère alors que l'installation n'est pas proposée
    // par ce navigateur, sauf si un deferred a été capturé.
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;

    setStatus("prompting");
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setStatus("installed");
      } else {
        setStatus("available");
      }
    } catch {
      setStatus("available");
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  return {
    status,
    canInstall: status === "available",
    install,
  };
}
