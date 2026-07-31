import { useMemo, useState } from "react";
import { Wallet, UserPlus, ShieldAlert, Clock } from "lucide-react";
import type { HomeActivityItem, HomeOverview } from "@/hooks/useHomeOverview";

const iconOf = (k: HomeActivityItem["kind"]) =>
  k === "paiement" ? Wallet : k === "inscription" ? UserPlus : ShieldAlert;

const toneOf = (k: HomeActivityItem["kind"]) =>
  k === "paiement"
    ? "text-[hsl(152_55%_30%)] bg-[hsl(152_55%_36%)]/12"
    : k === "inscription"
    ? "text-primary bg-primary/10"
    : "text-destructive bg-destructive/10";

const typeLabel = (k: HomeActivityItem["kind"]) =>
  k === "paiement" ? "Paiement" : k === "inscription" ? "Nouvelle inscription" : "Incident";

function relative(at: string) {
  const d = new Date(at).getTime();
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return new Date(at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "inscription", label: "Inscriptions" },
  { key: "paiement", label: "Paiements" },
  { key: "incident", label: "Incidents" },
] as const;

export function HomeActivity({ data }: { data: HomeOverview }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const items = useMemo(
    () => (filter === "all" ? data.activite : data.activite.filter((a) => a.kind === filter)),
    [data.activite, filter],
  );

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm h-full md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" /> Activité récente
        </h3>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
      ) : (
        <ul className="relative space-y-3 before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-px before:bg-border">
          {items.map((a, i) => {
            const Icon = iconOf(a.kind);
            return (
              <li key={i} className="relative flex items-start gap-3">
                <span
                  className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${toneOf(a.kind)}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug break-words" title={a.label}>
                    {a.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground break-words">
                    {typeLabel(a.kind)} · {a.sub}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap pt-1">
                  {relative(a.at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
