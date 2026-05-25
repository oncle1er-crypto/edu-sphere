import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  label?: string;
  className?: string;
  /** Compact = pour un encart, sinon prend tout l'espace dispo. */
  compact?: boolean;
}

/** Loader élégant à utiliser à l'intérieur d'une page/section. */
export function PageLoader({
  label = "Chargement…",
  className,
  compact = false,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        compact ? "py-6" : "min-h-[240px] py-12",
        className,
      )}
    >
      <div className="relative h-10 w-10">
        <span
          className="absolute inset-0 rounded-full border-2 border-primary/15"
          aria-hidden
        />
        <Loader2 className="absolute inset-0 m-auto h-10 w-10 text-primary animate-spin" />
      </div>
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
}

export default PageLoader;
