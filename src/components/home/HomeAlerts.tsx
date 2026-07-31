import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import type { HomeOverview } from "@/hooks/useHomeOverview";

export function HomeAlerts({ data }: { data: HomeOverview }) {
  const { can } = usePermissions();
  const a = data.alertes;

  const rows = [
    { n: a.impayes, label: "élèves avec impayés", to: "/finances", mod: "finances" },
    { n: a.facturesEchues, label: "factures échues", to: "/finances", mod: "finances" },
    { n: a.dossiersIncomplets, label: "dossiers sans document", to: "/eleves", mod: "eleves" },
    { n: a.tenuesReservees, label: "tenues réservées à retirer", to: "/services-ponctuels", mod: "services_ponctuels" },
    { n: a.stocksBas, label: "stocks de tenues bas", to: "/services-ponctuels", mod: "services_ponctuels" },
  ].filter((r) => r.n > 0 && can(r.mod, "view"));

  return (
    <div className="rounded-xl border bg-card/70 backdrop-blur-sm p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Alertes &amp; tâches</h3>
      </div>

      {rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <CheckCircle2 className="h-4 w-4 text-success" /> Tout est à jour.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.slice(0, 5).map((r) => (
            <li key={r.label}>
              <Link
                to={r.to}
                className="flex items-center justify-between gap-2 py-2 text-sm hover:text-primary transition-colors"
              >
                <span className="truncate">
                  <span className="font-bold text-primary">{r.n}</span> {r.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
