import { Lock, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";
import { useLock, type LockableModule } from "@/context/AcademicPeriodContext";
import { cn } from "@/lib/utils";

interface Props {
  module: LockableModule;
  /** Date concernée par l'opération (ex: date du paiement, de l'absence). Défaut = aujourd'hui. */
  date?: string;
  /** Si true, le contenu reste affiché mais désactivé (pointer-events-none + opacity). */
  children?: ReactNode;
  className?: string;
}

/** Bandeau d'alerte affiché en haut d'un écran si la période/année est verrouillée. */
export function LockBanner({ module, date }: Pick<Props, "module" | "date">) {
  const { locked, reason } = useLock(module, date);
  if (!locked) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          Modification verrouillée
        </p>
        <p className="text-muted-foreground mt-0.5">{reason}</p>
      </div>
    </div>
  );
}

/** Wrap un bloc d'édition : affiche le bandeau et désactive le contenu si verrouillé. */
export function LockGuard({ module, date, children, className }: Props) {
  const { locked } = useLock(module, date);
  return (
    <div className={cn("space-y-4", className)}>
      <LockBanner module={module} date={date} />
      <fieldset
        disabled={locked}
        className={cn(
          "space-y-4 contents",
          locked && "pointer-events-none opacity-60 select-none"
        )}
      >
        {children}
      </fieldset>
    </div>
  );
}
