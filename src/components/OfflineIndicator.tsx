import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

/**
 * Bandeau discret affiché en bas quand l'utilisateur perd la connexion,
 * + petit toast de retour en ligne pendant 2s.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowBackOnline(false);
    } else if (wasOffline) {
      setShowBackOnline(true);
      const t = setTimeout(() => setShowBackOnline(false), 2500);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline]);

  if (online && !showBackOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-[80]",
        "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium",
        "border backdrop-blur-md transition-all",
        online
          ? "bg-emerald-600/95 text-white border-emerald-700"
          : "bg-destructive/95 text-destructive-foreground border-destructive"
      )}
    >
      {online ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Connexion rétablie</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Vous êtes hors ligne — certaines fonctionnalités sont limitées</span>
        </>
      )}
    </div>
  );
}

export default OfflineIndicator;
