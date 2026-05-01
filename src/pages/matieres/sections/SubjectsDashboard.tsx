import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Library, Layers, Clock, Users } from "lucide-react";
import { SUBJECTS } from "../data";

export default function SubjectsDashboard() {
  const total = SUBJECTS.length;
  const actives = SUBJECTS.filter((s) => s.active).length;
  const categories = Array.from(new Set(SUBJECTS.map((s) => s.categorie)));

  const kpis = [
    { label: "Total matières", value: String(total), trend: `${actives} actives`, icon: Library, color: "text-primary" },
    { label: "Catégories", value: String(categories.length), trend: "Disciplines", icon: Layers, color: "text-emerald-600" },
    { label: "Volume hebdo moyen", value: "26 h", trend: "Tous cycles", icon: Clock, color: "text-blue-600" },
    { label: "Enseignants affectés", value: "48", trend: "Sur 14 matières", icon: Users, color: "text-accent-foreground" },
  ];

  const repartition = categories.map((cat) => ({
    nom: cat,
    nb: SUBJECTS.filter((s) => s.categorie === cat).length,
  }));

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble"
        description="Synthèse des matières enseignées au GROUPE SCOLAIRE LA PROVIDENCE."
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
        icon={<Layers className="h-5 w-5" />}
        title="Répartition par catégorie"
        description="Nombre de matières par grande discipline."
        hideSave
      >
        <div className="space-y-4">
          {repartition.map((r) => {
            const pct = Math.round((r.nb / total) * 100);
            return (
              <div key={r.nom}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{r.nom}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.nb}</span>
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
