import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, BookOpen, Repeat, Users, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const kpis = [
  { label: "Ouvrages", value: "8 432", icon: BookOpen, color: "text-primary" },
  { label: "Emprunts en cours", value: "284", icon: Repeat, color: "text-accent" },
  { label: "Lecteurs actifs", value: "612", icon: Users, color: "text-primary" },
  { label: "Retards", value: "23", icon: AlertCircle, color: "text-destructive" },
];

export default function LibraryDashboard() {
  return (
    <SettingsSection
      title="Tableau de bord — Bibliothèque"
      description="Vue d'ensemble de la collection et des emprunts."
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
            <h3 className="font-bold mb-3">Top emprunts du mois</h3>
            <ol className="space-y-2 text-sm">
              <li className="flex justify-between"><span>1. Le Petit Prince</span><span className="font-semibold">42</span></li>
              <li className="flex justify-between"><span>2. L'Aventure ambiguë</span><span className="font-semibold">31</span></li>
              <li className="flex justify-between"><span>3. Atlas Junior</span><span className="font-semibold">28</span></li>
              <li className="flex justify-between"><span>4. Maths 3ème</span><span className="font-semibold">24</span></li>
              <li className="flex justify-between"><span>5. Une si longue lettre</span><span className="font-semibold">19</span></li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Répartition par catégorie</h3>
            <div className="space-y-2">
              {[["Romans", 38], ["Manuels scolaires", 32], ["Sciences", 15], ["Jeunesse", 10], ["Autres", 5]].map(([c, v]) => (
                <div key={c as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{c}</span><span className="font-semibold">{v}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
