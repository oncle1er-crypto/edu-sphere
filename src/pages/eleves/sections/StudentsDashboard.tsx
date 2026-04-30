import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Users, UserPlus, UserMinus, GraduationCap, CalendarCheck } from "lucide-react";

const kpis = [
  { label: "Total élèves", value: "1 248", trend: "+34 ce mois", icon: Users, color: "text-primary" },
  { label: "Nouvelles inscriptions", value: "47", trend: "Cette semaine", icon: UserPlus, color: "text-emerald-600" },
  { label: "Désinscriptions", value: "8", trend: "Ce trimestre", icon: UserMinus, color: "text-destructive" },
  { label: "Taux de présence", value: "94,2 %", trend: "+1,3 pts", icon: CalendarCheck, color: "text-accent-foreground" },
];

const repartition = [
  { cycle: "Maternelle", effectif: 142, capacite: 180, color: "bg-pink-500" },
  { cycle: "Primaire", effectif: 486, capacite: 540, color: "bg-blue-500" },
  { cycle: "Collège", effectif: 412, capacite: 480, color: "bg-emerald-500" },
  { cycle: "Lycée", effectif: 208, capacite: 280, color: "bg-amber-500" },
];

export default function StudentsDashboard() {
  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble"
        description="Indicateurs clés sur les effectifs et le suivi des élèves."
        hideSave
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-2xl font-extrabold font-display">{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{k.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<GraduationCap className="h-5 w-5" />}
        title="Répartition par cycle"
        description="Effectifs actuels et taux d'occupation."
        hideSave
      >
        <div className="space-y-4">
          {repartition.map((r) => {
            const pct = Math.round((r.effectif / r.capacite) * 100);
            return (
              <div key={r.cycle}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                    <span className="text-sm font-medium">{r.cycle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.effectif}</span>
                    <span className="text-xs text-muted-foreground">/ {r.capacite}</span>
                    <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}
