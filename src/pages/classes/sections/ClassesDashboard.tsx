import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, BookOpen, Users, GraduationCap, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";

export default function ClassesDashboard() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading } = useClasses(activeAnnee.id);
  const { cycles, loading: cyclesLoading } = useCycles();

  if (loading || cyclesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalClasses = classes.length;
  const totalEleves = classes.reduce((s, c) => s + (c.effectif ?? 0), 0);
  const totalCapacite = classes.reduce((s, c) => s + (c.capacite ?? 0), 0);
  const moyenneEffectif = totalClasses > 0 ? Math.round(totalEleves / totalClasses) : 0;
  const tauxRemplissage = totalCapacite > 0 ? Math.round((totalEleves / totalCapacite) * 100) : 0;

  const kpis = [
    { label: "Total classes", value: String(totalClasses), trend: `${totalEleves} élèves au total`, icon: BookOpen, color: "text-primary" },
    { label: "Effectif moyen", value: `${moyenneEffectif} él/cl`, trend: `Capacité moy. ${totalClasses > 0 ? Math.round(totalCapacite / totalClasses) : 0}`, icon: Users, color: "text-emerald-600" },
    { label: "Taux remplissage", value: `${tauxRemplissage} %`, trend: `${totalEleves} / ${totalCapacite} places`, icon: GraduationCap, color: "text-accent-foreground" },
    { label: "Cycles actifs", value: String(cycles.length), trend: cycles.map(c => c.nom).join(", "), icon: BookOpen, color: "text-blue-600" },
  ];

  // Group classes by cycle
  const cycleStats = cycles.map((cy) => {
    const cls = classes.filter((c) => c.cycle_nom === cy.nom);
    const effectif = cls.reduce((s, c) => s + (c.effectif ?? 0), 0);
    const capacite = cls.reduce((s, c) => s + (c.capacite ?? 0), 0);
    return { nom: cy.nom, classes: cls.length, effectif, capacite };
  });

  const colors = ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-cyan-500"];

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble"
        description="Synthèse de l'organisation pédagogique de l'établissement."
        hideSave
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.label} label={k.label} value={k.value} sub={k.trend} icon={k.icon} index={i} />
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
          {cycleStats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun cycle configuré.</p>
          )}
          {cycleStats.map((c, i) => {
            const pct = c.capacite > 0 ? Math.round((c.effectif / c.capacite) * 100) : 0;
            return (
              <div key={c.nom}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} />
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
