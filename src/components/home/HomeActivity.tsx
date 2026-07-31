import { Wallet, UserPlus, ShieldAlert } from "lucide-react";
import type { HomeActivityItem, HomeOverview } from "@/hooks/useHomeOverview";

const iconOf = (k: HomeActivityItem["kind"]) =>
  k === "paiement" ? Wallet : k === "inscription" ? UserPlus : ShieldAlert;

const toneOf = (k: HomeActivityItem["kind"]) =>
  k === "paiement"
    ? "text-success bg-success/10"
    : k === "inscription"
    ? "text-primary bg-primary/10"
    : "text-destructive bg-destructive/10";

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

export function HomeActivity({ data }: { data: HomeOverview }) {
  return (
    <div className="rounded-xl border bg-card/70 backdrop-blur-sm p-3 h-full">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Activité récente</h3>
      {data.activite.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
      ) : (
        <ul className="space-y-2">
          {data.activite.map((a, i) => {
            const Icon = iconOf(a.kind);
            return (
              <li key={i} className="flex items-center gap-2.5">
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneOf(a.kind)}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.sub}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{relative(a.at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
