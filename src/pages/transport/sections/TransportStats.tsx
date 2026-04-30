import { SettingsSection } from "@/components/settings/SettingsSection";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TransportStats() {
  return (
    <SettingsSection
      title="Statistiques transport"
      description="Indicateurs de performance de la flotte."
      icon={<BarChart3 className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Consommation par véhicule (L/100km)</h3>
            <div className="space-y-2">
              {[["DK-1234-AB", 21], ["DK-5678-CD", 19], ["DK-9012-EF", 23], ["DK-3456-GH", 25]].map(([v, c]) => (
                <div key={v as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono">{v}</span><span className="font-semibold">{c} L</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(c as number) * 3}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Indicateurs clés</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>Ponctualité moyenne</span><span className="font-semibold">94%</span></li>
              <li className="flex justify-between"><span>Taux de remplissage</span><span className="font-semibold">88%</span></li>
              <li className="flex justify-between"><span>Coût / élève / mois</span><span className="font-semibold">3 020 FCFA</span></li>
              <li className="flex justify-between"><span>Km parcourus (mois)</span><span className="font-semibold">12 480 km</span></li>
              <li className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Satisfaction parents</span><span className="font-semibold">4.5 / 5</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
