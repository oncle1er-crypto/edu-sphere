import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, Users, UtensilsCrossed, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const kpis = [
  { label: "Abonnés actifs", value: "342", icon: Users, color: "text-primary" },
  { label: "Repas servis (mois)", value: "6 840", icon: UtensilsCrossed, color: "text-accent" },
  { label: "Revenus cantine", value: "1.7M FCFA", icon: DollarSign, color: "text-primary" },
  { label: "Incidents en cours", value: "2", icon: AlertCircle, color: "text-destructive" },
];

export default function CanteenDashboard() {
  return (
    <SettingsSection
      title="Tableau de bord — Cantine"
      description="Vue d'ensemble de la restauration scolaire."
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
            <h3 className="font-bold mb-3">Fréquentation par jour</h3>
            <div className="space-y-2">
              {[["Lundi", 320], ["Mardi", 305], ["Mercredi", 180], ["Jeudi", 318], ["Vendredi", 295]].map(([d, v]) => (
                <div key={d as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{d}</span><span className="font-semibold">{v} repas</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(v as number) / 3.5}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Répartition abonnements</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>Mensuel</span><span className="font-semibold">214</span></li>
              <li className="flex justify-between"><span>Trimestriel</span><span className="font-semibold">96</span></li>
              <li className="flex justify-between"><span>Journalier</span><span className="font-semibold">32</span></li>
              <li className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Désinscrits ce mois</span><span className="font-semibold text-destructive">7</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
