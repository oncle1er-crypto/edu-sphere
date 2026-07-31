import { Layers, Check, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNiveau, NIVEAU_LABELS, type Niveau } from "@/context/NiveauContext";

/**
 * Sélecteur de niveau global (en-tête).
 * Primaire = Maternelle + Primaire. Secondaire = Collège/Lycée.
 */
export function NiveauSwitcher() {
  const { niveau, setNiveau, forced, isGlobal, effectifs, cycles } = useNiveau();

  if (cycles.length === 0) return null;

  const counts: Record<Niveau, number> = {
    all: effectifs.total,
    primaire: effectifs.primaire,
    secondaire: effectifs.secondaire,
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Select value={niveau} onValueChange={(v) => setNiveau(v as Niveau)} disabled={forced}>
        <SelectTrigger
          className={cn(
            "h-8 w-auto gap-1.5 px-2 text-xs font-medium bg-background",
            isGlobal ? "border" : "border-2 border-primary",
          )}
          aria-label="Niveau"
        >
          {forced ? (
            <Lock className="h-3.5 w-3.5 shrink-0 opacity-70" />
          ) : (
            <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
          )}
          <SelectValue asChild>
            <span className="truncate max-w-[110px] sm:max-w-[160px]">{NIVEAU_LABELS[niveau]}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(["all", "primaire", "secondaire"] as Niveau[]).map((n) => (
            <SelectItem key={n} value={n}>
              <span className="flex items-center gap-2">
                <span>{NIVEAU_LABELS[n]}</span>
                <span className="text-[10px] text-muted-foreground">{counts[n]} élèves</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isGlobal && (
        <span className="text-[10px] text-primary font-medium leading-none mt-0.5">
          {forced ? "Niveau imposé" : "Filtré"}
        </span>
      )}
    </div>
  );
}
