import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Users, UserPlus, GraduationCap, Loader2 } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";

export default function StudentsDashboard() {
  const { eleves, loading: loadingE } = useEleves();
  const { classes, loading: loadingC } = useClasses();
  const { cycles, loading: loadingCy } = useCycles();

  const loading = loadingE || loadingC || loadingCy;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const total = eleves.length;
  const inscrits = eleves.filter((e) => e.statut === "inscrit").length;

  const repartition = cycles.map((cy) => {
    const classeIds = classes.filter((c) => c.cycle_id === cy.id).map((c) => c.id);
    const effectif = eleves.filter((e) => e.classe_id && classeIds.includes(e.classe_id)).length;
    const capacite = classes
      .filter((c) => c.cycle_id === cy.id)
      .reduce((sum, c) => sum + (c.capacite ?? 50), 0);
    return { cycle: cy.nom, effectif, capacite };
  });

  const kpis = [
    { label: "Total élèves", value: total.toLocaleString("fr-FR"), icon: Users, color: "text-primary" },
    { label: "Nouvelles inscriptions", value: inscrits.toString(), icon: UserPlus, color: "text-emerald-600" },
    { label: "Classes", value: classes.length.toString(), icon: GraduationCap, color: "text-accent-foreground" },
  ];

  const cycleColors = ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble"
        description="Indicateurs clés sur les effectifs et le suivi des élèves."
        hideSave
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-2xl font-extrabold font-display">{k.value}</p>
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
          {repartition.map((r, i) => {
            const pct = r.capacite > 0 ? Math.round((r.effectif / r.capacite) * 100) : 0;
            return (
              <div key={r.cycle}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${cycleColors[i % cycleColors.length]}`} />
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
          {repartition.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun cycle configuré.</p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
