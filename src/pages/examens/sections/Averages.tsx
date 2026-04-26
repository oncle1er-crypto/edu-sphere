import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award } from "lucide-react";

const top = [
  { rang: 1, nom: "Nguemo Sarah", classe: "3ème A", moyenne: 16.85 },
  { rang: 2, nom: "Owono Marie", classe: "Tle C", moyenne: 16.10 },
  { rang: 3, nom: "Mballa Junior", classe: "Tle C", moyenne: 15.42 },
  { rang: 4, nom: "Bessala André", classe: "1ère D", moyenne: 14.90 },
  { rang: 5, nom: "Atangana Léa", classe: "6ème B", moyenne: 13.75 },
];

const matieres = [
  { nom: "Mathématiques", moy: 12.4 },
  { nom: "Français", moy: 13.1 },
  { nom: "Anglais", moy: 14.0 },
  { nom: "Physique-Chimie", moy: 11.8 },
  { nom: "Histoire-Géographie", moy: 13.6 },
  { nom: "SVT", moy: 12.9 },
];

export default function Averages() {
  return (
    <SettingsSection icon={Award} title="Moyennes & classements" description="Top des élèves et moyennes par matière.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h4 className="font-bold font-display text-primary">Top 5 élèves</h4>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y">
              {top.map((t) => (
                <li key={t.rang} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {t.rang}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{t.nom}</p>
                    <p className="text-xs text-muted-foreground">{t.classe}</p>
                  </div>
                  <p className="font-bold text-primary">{t.moyenne.toFixed(2)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h4 className="font-bold font-display text-primary">Moyenne par matière</h4>
          </div>
          <CardContent className="p-6 space-y-4">
            {matieres.map((m) => (
              <div key={m.nom}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{m.nom}</span>
                  <span className="text-muted-foreground">{m.moy.toFixed(1)} / 20</span>
                </div>
                <Progress value={m.moy * 5} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
