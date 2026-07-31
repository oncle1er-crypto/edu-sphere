import { Megaphone, CalendarDays } from "lucide-react";
import type { HomeOverview } from "@/hooks/useHomeOverview";

export function HomeAgenda({ data }: { data: HomeOverview }) {
  return (
    <div className="rounded-xl border bg-card/70 backdrop-blur-sm p-3 h-full">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Agenda &amp; annonces</h3>
      {data.agenda.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune annonce publiée.</p>
      ) : (
        <ul className="space-y-2">
          {data.agenda.map((a, i) => {
            const Icon = a.kind === "annonce" ? Megaphone : CalendarDays;
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    a.kind === "annonce" ? "text-accent-foreground bg-accent/20" : "text-primary bg-primary/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.titre}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{a.sub}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
