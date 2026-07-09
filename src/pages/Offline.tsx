import { useEffect } from "react";
import { WifiOff, RotateCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Page hors-ligne affichée en fallback lorsque la navigation échoue
 * (échec de chargement de chunk sans réseau). N'interagit avec aucune
 * requête Supabase.
 */
export default function OfflinePage() {
  const online = useOnlineStatus();

  // Quand le réseau revient, on retente automatiquement la page précédente.
  useEffect(() => {
    if (online) {
      const t = setTimeout(() => {
        if (window.history.length > 1) window.history.back();
        else window.location.replace("/");
      }, 400);
      return () => clearTimeout(t);
    }
  }, [online]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <WifiOff className="h-9 w-9 sm:h-8 sm:w-8 text-primary" aria-hidden />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          {online ? "Reconnexion…" : "Hors ligne"}
        </span>
        <h1 className="font-display text-2xl font-extrabold text-primary mb-2">
          Cette page n'a pas pu être chargée
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Votre appareil semble hors ligne ou la connexion est instable.
          Vérifiez votre réseau puis réessayez — vos données sont en sécurité.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow hover:opacity-95 transition"
          >
            <RotateCw className="h-4 w-4" /> Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
