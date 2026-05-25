import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, CalendarDays, AlertTriangle, Users, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const kpis = [
  { label: "Classes planifiées", value: "42 / 45", icon: CalendarDays, color: "text-primary" },
  { label: "Enseignants assignés", value: "78", icon: Users, color: "text-primary" },
  { label: "Salles occupées", value: "31 / 38", icon: DoorOpen, color: "text-primary" },
  { label: "Conflits détectés", value: "3", icon: AlertTriangle, color: "text-destructive" },
];

export default function TimetableDashboard() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Tableau de bord — Emploi du temps"
        description="Vue d'ensemble de la planification hebdomadaire."
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
              <h3 className="font-bold mb-3">Taux d'occupation par jour</h3>
              <div className="space-y-2">
                {[["Lundi", 92], ["Mardi", 88], ["Mercredi", 65], ["Jeudi", 90], ["Vendredi", 85]].map(([d, v]) => (
                  <div key={d as string}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{d}</span><span className="font-semibold">{v}%</span>
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
              <h3 className="font-bold mb-3">Alertes récentes</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-destructive mt-0.5" /> Salle 12 double-réservée mardi 10h.</li>
                <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-primary mt-0.5" /> M. Diop dépasse 22h/semaine.</li>
                <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-primary mt-0.5" /> 6ème B sans cours d'EPS planifié.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </SettingsSection>
    </div>
  );
}
