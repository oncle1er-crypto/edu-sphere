import { Megaphone, CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import type { HomeAgendaItem, HomeOverview } from "@/hooks/useHomeOverview";

function statusOf(a: HomeAgendaItem) {
  if (a.kind !== "periode" || !a.debut || !a.fin) return null;
  const now = Date.now();
  const d = new Date(a.debut).getTime();
  const f = new Date(a.fin).getTime();
  if (now < d) return { label: "À venir", cls: "bg-[hsl(205_80%_42%)]/12 text-[hsl(205_80%_36%)]" };
  if (now > f) return { label: "Terminé", cls: "bg-muted text-muted-foreground" };
  return { label: "En cours", cls: "bg-[hsl(152_55%_36%)]/12 text-[hsl(152_55%_28%)]" };
}

function dateChip(at: string) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.toLocaleDateString("fr-FR", { day: "2-digit" }),
    month: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

export function HomeAgenda({ data }: { data: HomeOverview }) {
  const { can } = usePermissions();

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm h-full md:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary" /> Agenda &amp; annonces
        </h3>
        {can("communication", "view") && (
          <Link
            to="/communication/annonces"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors duration-150 hover:underline"
          >
            Voir les annonces <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {data.agenda.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune annonce publiée.</p>
      ) : (
        <ul className="space-y-2">
          {data.agenda.map((a, i) => {
            const Icon = a.kind === "annonce" ? Megaphone : CalendarDays;
            const chip = dateChip(a.at);
            const status = statusOf(a);
            return (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border bg-background/60 p-2.5 transition-colors duration-150 hover:bg-muted/50"
              >
                {chip ? (
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/8 border">
                    <span className="text-sm font-extrabold font-display leading-none text-primary">{chip.day}</span>
                    <span className="text-[9px] font-semibold text-muted-foreground">{chip.month}</span>
                  </span>
                ) : (
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug break-words" title={a.titre}>
                    {a.titre}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{a.sub}</p>
                </div>
                {status && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                    {status.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
