import { AlertTriangle, CalendarClock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtF, type ServiceKpis } from "./serviceKpis";

interface Props {
  kpis: ServiceKpis;
  service: "cantine" | "transport";
  onRelancer?: () => void;
}

/** Notification in-app : échéances arrivées et impayés à relancer. */
export function ServiceEcheancesAlert({ kpis, service, onRelancer }: Props) {
  if (kpis.nbEnRetard === 0 && kpis.nbEcheancesDuJour === 0) return null;
  const label = service === "cantine" ? "cantine" : "transport";

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm flex flex-wrap items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      <span>
        {kpis.nbEnRetard > 0 && (
          <>
            <b>{kpis.nbEnRetard}</b> échéance{kpis.nbEnRetard > 1 ? "s" : ""} {label} dépassée
            {kpis.nbEnRetard > 1 ? "s" : ""} — <b>{fmtF(kpis.enRetard)}</b> à recouvrer.
          </>
        )}
        {kpis.nbEcheancesDuJour > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            dont {kpis.nbEcheancesDuJour} arrivant à échéance aujourd'hui.
          </span>
        )}
      </span>
      {onRelancer && kpis.nbEnRetard > 0 && (
        <Button size="sm" variant="outline" className="ml-auto" onClick={onRelancer}>
          <MessageSquare className="h-3.5 w-3.5" /> Relancer les impayés
        </Button>
      )}
    </div>
  );
}

export default ServiceEcheancesAlert;
