import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LegendItem {
  label: string;
  description: string;
  /** Couleur sémantique du badge (classes Tailwind appliquées au badge) */
  className?: string;
}

interface StatusLegendProps {
  title?: string;
  items: LegendItem[];
  className?: string;
  /** Replié par défaut. */
  defaultOpen?: boolean;
}

/** Légende repliable expliquant la signification des statuts d'un tableau. */
export function StatusLegend({
  title = "Légende des statuts",
  items,
  className,
  defaultOpen = false,
}: StatusLegendProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border bg-muted/30", className)}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between h-auto py-2.5 px-3 hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && (
        <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-start gap-2 text-xs">
              <Badge
                variant="outline"
                className={cn("shrink-0 capitalize", it.className)}
              >
                {it.label}
              </Badge>
              <span className="text-muted-foreground leading-snug pt-0.5">{it.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StatusLegend;
