import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Users, GraduationCap, Briefcase, CalendarCheck, Wallet } from "lucide-react";

const kpis = [
  { label: "Total personnel", value: "87", trend: "+3 ce mois", icon: Users, color: "text-primary" },
  { label: "Enseignants", value: "62", trend: "71 % du staff", icon: GraduationCap, color: "text-emerald-600" },
  { label: "Administratifs", value: "25", trend: "29 % du staff", icon: Briefcase, color: "text-blue-600" },
  { label: "Masse salariale", value: "18,4 M FCFA", trend: "Mensuelle", icon: Wallet, color: "text-accent-foreground" },
];

const repartition = [
  { type: "Enseignants titulaires", count: 48, total: 62, color: "bg-emerald-500" },
  { type: "Enseignants vacataires", count: 14, total: 62, color: "bg-amber-500" },
  { type: "Personnel administratif", count: 12, total: 25, color: "bg-blue-500" },
  { type: "Personnel d'entretien", count: 13, total: 25, color: "bg-purple-500" },
];

export default function StaffDashboard() {
  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble RH"
        description="Indicateurs clés sur le personnel de l'établissement."
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
        icon={<CalendarCheck className="h-5 w-5" />}
        title="Répartition du personnel"
        description="Par catégorie et type de contrat."
        hideSave
      >
        <div className="space-y-4">
          {repartition.map((r) => {
            const pct = Math.round((r.count / r.total) * 100);
            return (
              <div key={r.type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                    <span className="text-sm font-medium">{r.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.count}</span>
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
