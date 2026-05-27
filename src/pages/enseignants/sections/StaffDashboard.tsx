import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Users, GraduationCap, Briefcase, CalendarCheck, Loader2 } from "lucide-react";
import { useEnseignants } from "@/hooks/useEnseignants";
import { motion } from "framer-motion";

export default function StaffDashboard() {
  const { enseignants, loading } = useEnseignants();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const total = enseignants.length;
  const actifs = enseignants.filter((e) => e.statut === "actif").length;
  const cdi = enseignants.filter((e) => e.type_contrat === "CDI").length;
  const cdd = enseignants.filter((e) => e.type_contrat === "CDD").length;
  const vacataires = enseignants.filter((e) => e.type_contrat === "Vacataire").length;

  const kpis = [
    { label: "Total personnel", value: total.toString(), icon: Users, variant: "stat-card--primary", iconColor: "text-primary" },
    { label: "Actifs", value: actifs.toString(), icon: GraduationCap, variant: "stat-card--success", iconColor: "text-[hsl(152_60%_38%)]" },
    { label: "CDI", value: cdi.toString(), icon: Briefcase, variant: "stat-card--info", iconColor: "text-[hsl(205_80%_45%)]" },
  ];

  const repartition = [
    { type: "CDI", count: cdi, total, color: "bg-emerald-500" },
    { type: "CDD", count: cdd, total, color: "bg-amber-500" },
    { type: "Vacataire", count: vacataires, total, color: "bg-blue-500" },
  ].filter((r) => r.count > 0);

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble RH"
        description="Indicateurs clés sur le personnel de l'établissement."
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
        icon={<CalendarCheck className="h-5 w-5" />}
        title="Répartition par type de contrat"
        description="Vue d'ensemble du personnel."
        hideSave
      >
        <div className="space-y-4">
          {repartition.map((r) => {
            const pct = r.total > 0 ? Math.round((r.count / r.total) * 100) : 0;
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
          {repartition.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun enseignant enregistré.</p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
