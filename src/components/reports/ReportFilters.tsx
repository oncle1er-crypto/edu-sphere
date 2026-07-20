import { Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ReportFiltersValue {
  from: string;
  to: string;
  classe: string; // "__all__" = toutes
}

interface Props {
  value: ReportFiltersValue;
  onChange: (v: ReportFiltersValue) => void;
  classes: string[];
  showClasse?: boolean;
  periodeLabel?: string;
  title?: string;
}

export const ALL_CLASSES = "__all__";

export function isFiltersActive(v: ReportFiltersValue) {
  return !!(v.from || v.to || (v.classe && v.classe !== ALL_CLASSES));
}

export function formatPeriodeLabel(from: string, to: string, fallback: string) {
  if (!from && !to) return fallback;
  const fmt = (s: string) => new Date(s).toLocaleDateString("fr-FR");
  if (from && to) return `${fmt(from)} → ${fmt(to)}`;
  if (from) return `Depuis le ${fmt(from)}`;
  return `Jusqu'au ${fmt(to)}`;
}

export function ReportFilters({ value, onChange, classes, showClasse = true, periodeLabel, title = "Filtres" }: Props) {
  const active = isFiltersActive(value);
  const reset = () => onChange({ from: "", to: "", classe: ALL_CLASSES });
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4 text-primary" />
        {title}
        {active && (
          <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-xs" onClick={reset}>
            <X className="h-3 w-3" />Réinitialiser
          </Button>
        )}
      </div>
      <div className={`grid grid-cols-1 gap-3 ${showClasse ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </div>
        {showClasse && (
          <div className="space-y-1">
            <Label className="text-xs">Classe</Label>
            <Select value={value.classe} onValueChange={(v) => onChange({ ...value, classe: v })}>
              <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASSES}>Toutes les classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {periodeLabel && (
        <p className="text-xs text-muted-foreground">Période appliquée : <span className="font-medium">{periodeLabel}</span></p>
      )}
    </div>
  );
}
