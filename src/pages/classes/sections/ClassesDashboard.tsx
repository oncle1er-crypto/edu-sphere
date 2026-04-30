import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, BookOpen, Users, GraduationCap, MapPin } from "lucide-react";

const kpis = [
  { label: "Total classes", value: "42", trend: "Année 2025-2026", icon: BookOpen, color: "text-primary" },
  { label: "Effectif moyen", value: "32 él/cl", trend: "Capacité 40", icon: Users, color: "text-emerald-600" },
  { label: "Salles utilisées", value: "38 / 45", trend: "84 % d'occupation", icon: MapPin, color: "text-blue-600" },
  { label: "Taux remplissage", value: "82 %", trend: "+4 pts vs N-1", icon: GraduationCap, color: "text-accent-foreground" },
];

const cycles = [
  { nom: "Maternelle", classes: 6, effectif: 142, capacite: 180, color: "bg-pink-500" },
  { nom: "Primaire", classes: 12, effectif: 486, capacite: 540, color: "bg-blue-500" },
  { nom: "Collège", classes: 14, effectif: 412, capacite: 560, color: "bg-emerald-500" },
  { nom: "Lycée", classes: 10, effectif: 208, capacite: 320, color: "bg-amber-500" },
];

export default function ClassesDashboard() {
  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble"
        description="Synthèse de l'organisation pédagogique de l'établissement."
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
        description="Nombre de classes et taux de remplissage."
        hideSave
      >
        <div className="space-y-4">
          {cycles.map((c) => {
            const pct = Math.round((c.effectif / c.capacite) * 100);
            return (
              <div key={c.nom}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                    <span className="text-sm font-medium">{c.nom}</span>
                    <Badge variant="outline" className="text-[10px]">{c.classes} classes</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.effectif}</span>
                    <span className="text-xs text-muted-foreground">/ {c.capacite}</span>
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
