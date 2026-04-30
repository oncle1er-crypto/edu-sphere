import { SettingsSection } from "@/components/settings/SettingsSection";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LibraryStats() {
  return (
    <SettingsSection
      title="Statistiques bibliothèque"
      description="Indicateurs de fréquentation et de lecture."
      icon={<BarChart3 className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Emprunts par mois</h3>
            <div className="space-y-2">
              {[["Janvier", 320], ["Février", 410], ["Mars", 480], ["Avril", 540]].map(([m, v]) => (
                <div key={m as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m}</span><span className="font-semibold">{v}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(v as number) / 6}%` }} />
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
              <li className="flex justify-between"><span>Taux de rotation</span><span className="font-semibold">3.2 / livre</span></li>
              <li className="flex justify-between"><span>Durée moyenne emprunt</span><span className="font-semibold">11 j</span></li>
              <li className="flex justify-between"><span>Taux de retour à temps</span><span className="font-semibold">92%</span></li>
              <li className="flex justify-between"><span>Lecteurs actifs / mois</span><span className="font-semibold">412</span></li>
              <li className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Pénalités collectées</span><span className="font-semibold text-primary">42 800 FCFA</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
