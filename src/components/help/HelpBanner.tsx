import { ReactNode, useState } from "react";
import { Info, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HelpBannerProps {
  title?: string;
  children: ReactNode;
  variant?: "info" | "tip";
  /** Si défini, le bandeau peut être masqué et la préférence stockée localement. */
  storageKey?: string;
  className?: string;
}

/**
 * Bandeau pédagogique pour expliquer une page aux nouveaux utilisateurs.
 * Utilisation : <HelpBanner title="À quoi sert cette page ?">…</HelpBanner>
 */
export function HelpBanner({
  title,
  children,
  variant = "info",
  storageKey,
  className,
}: HelpBannerProps) {
  const k = storageKey ? `help-banner:${storageKey}` : null;
  const [hidden, setHidden] = useState<boolean>(() => {
    if (!k) return false;
    try {
      return localStorage.getItem(k) === "1";
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  const Icon = variant === "tip" ? Lightbulb : Info;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-accent/10 border-accent/30 text-foreground px-4 py-3 flex items-start gap-3",
        className,
      )}
      role="note"
    >
      <div className="h-8 w-8 rounded-md bg-accent/20 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 text-sm leading-relaxed space-y-1">
        {title && <p className="font-semibold text-primary">{title}</p>}
        <div className="text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-5">
          {children}
        </div>
      </div>
      {k && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 -mr-1 -mt-1"
          aria-label="Masquer cette aide"
          onClick={() => {
            try {
              localStorage.setItem(k, "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default HelpBanner;
