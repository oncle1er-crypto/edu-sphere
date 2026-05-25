import logoImg from "@/assets/login-logo.png";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  label?: string;
  className?: string;
  /** Plein écran (splash) ou inline pour conteneur */
  fullscreen?: boolean;
}

/**
 * Splash / app loader premium avec logo de l'école.
 * Utilisé au démarrage et pendant les vérifications de session.
 */
export function AppLoader({
  label = "Chargement de votre espace…",
  className,
  fullscreen = true,
}: AppLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-6 bg-background",
        fullscreen ? "fixed inset-0 z-[100]" : "w-full py-16",
        className,
      )}
    >
      <div className="relative">
        {/* halo */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse"
          style={{ background: "hsl(var(--primary))" }}
        />
        {/* anneau rotatif */}
        <div
          className="absolute -inset-3 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: "hsl(var(--primary))",
            borderRightColor: "hsl(var(--accent))",
            animationDuration: "1.6s",
          }}
        />
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-card shadow-xl ring-4 ring-background flex items-center justify-center overflow-hidden">
          <img
            src={logoImg}
            alt="La Providence"
            className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center px-6">
        <p className="text-sm sm:text-base font-medium text-foreground/80">{label}</p>
        <div className="flex gap-1.5 mt-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

export default AppLoader;
