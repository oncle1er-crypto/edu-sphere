import { Card, CardContent } from "@/components/ui/card";
import { HelpTooltip } from "@/components/help/HelpTooltip";
import { cn } from "@/lib/utils";
import { fmtF, type ServiceKpis } from "./serviceKpis";
import { Users, Receipt, Wallet, AlertTriangle, CalendarClock } from "lucide-react";

interface Props {
  abonnesActifs: number;
  kpis: ServiceKpis;
  service: "cantine" | "transport";
}

/** Cartes d'indicateurs clarifiées, communes à la cantine et au transport. */
export function ServiceKpiCards({ abonnesActifs, kpis, service }: Props) {
  const label = service === "cantine" ? "à la cantine" : "au transport";
  const items = [
    {
      label: "Abonnés actifs",
      value: abonnesActifs.toLocaleString("fr-FR"),
      icon: Users,
      help: `Élèves actuellement inscrits ${label} (hors abonnements résiliés ou suspendus).`,
      tone: "text-foreground",
    },
    {
      label: "Facturé à ce jour",
      value: fmtF(kpis.factureAJour),
      icon: Receipt,
      help: "Total des factures dont l'échéance est déjà arrivée. Les échéances futures ne sont pas comptées.",
      tone: "text-foreground",
    },
    {
      label: "Encaissé",
      value: fmtF(kpis.encaisse),
      icon: Wallet,
      help: "Sommes réellement reçues des familles, toutes échéances confondues.",
      tone: "text-primary",
    },
    {
      label: "En retard",
      value: fmtF(kpis.enRetard),
      icon: AlertTriangle,
      help: "Reste dû sur les factures déjà échues. C'est le montant à relancer.",
      tone: "text-destructive",
      sub: kpis.nbEnRetard > 0 ? `${kpis.nbEnRetard} facture${kpis.nbEnRetard > 1 ? "s" : ""}` : undefined,
    },
    {
      label: "À venir",
      value: fmtF(kpis.aVenir),
      icon: CalendarClock,
      help: "Factures émises dont l'échéance n'est pas encore arrivée : ce n'est pas un impayé.",
      tone: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="border-border/60">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <it.icon className="h-3.5 w-3.5" />
              <span className="truncate">{it.label}</span>
              <HelpTooltip text={it.help} />
            </div>
            <p className={cn("text-lg font-extrabold font-display", it.tone)}>{it.value}</p>
            {it.sub && <p className="text-[11px] text-muted-foreground">{it.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ServiceKpiCards;
