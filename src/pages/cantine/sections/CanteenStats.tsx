import { SettingsSection } from "@/components/settings/SettingsSection";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CanteenStats() {
  return (
    <SettingsSection
      title="Statistiques cantine"
      description="Indicateurs clés de la restauration."
      icon={<BarChart3 className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Évolution des repas servis</h3>
            <div className="space-y-2">
              {[["Janvier", 6200], ["Février", 6510], ["Mars", 6720], ["Avril", 6840]].map(([m, v]) => (
                <div key={m as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m}</span><span className="font-semibold">{(v as number).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(v as number) / 70}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Coût moyen par repas</h3>
            <p className="text-3xl font-extrabold text-primary">248 FCFA</p>
            <p className="text-sm text-muted-foreground mt-1">Marge moyenne : <strong className="text-foreground">252 FCFA</strong></p>
            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between"><span>Taux d'occupation</span><span className="font-semibold">87%</span></div>
              <div className="flex justify-between"><span>Gaspillage estimé</span><span className="font-semibold">4.2%</span></div>
              <div className="flex justify-between"><span>Satisfaction parents</span><span className="font-semibold">4.3 / 5</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
