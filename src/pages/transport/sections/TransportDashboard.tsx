import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, Bus, Users, MapPin, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const kpis = [
  { label: "Véhicules en service", value: "8 / 9", icon: Bus, color: "text-primary" },
  { label: "Élèves transportés", value: "412", icon: Users, color: "text-accent" },
  { label: "Lignes actives", value: "6", icon: MapPin, color: "text-primary" },
  { label: "Incidents (mois)", value: "2", icon: AlertTriangle, color: "text-destructive" },
];

export default function TransportDashboard() {
  return (
    <SettingsSection
      title="Tableau de bord — Transport"
      description="Vue d'ensemble de la flotte et des trajets."
      icon={<LayoutDashboard className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Taux de remplissage par ligne</h3>
            <div className="space-y-2">
              {[["Ligne A — Nord", 84], ["Ligne B — Sud", 84], ["Ligne C — Est", 94], ["Ligne D — Ouest", 87]].map(([l, v]) => (
                <div key={l as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{l}</span><span className="font-semibold">{v}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Coûts du mois</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>Carburant</span><span className="font-semibold">485 000 FCFA</span></li>
              <li className="flex justify-between"><span>Maintenance</span><span className="font-semibold">120 000 FCFA</span></li>
              <li className="flex justify-between"><span>Salaires chauffeurs</span><span className="font-semibold">640 000 FCFA</span></li>
              <li className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Recettes abonnements</span><span className="font-semibold text-primary">2.1M FCFA</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
