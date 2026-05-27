import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { LayoutDashboard, School, Users, GraduationCap, DollarSign, CheckCircle2, PauseCircle } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";

export default function SchoolsDashboard() {
  const { ecoles } = useEcoles();
  const actives = ecoles.filter((e) => e.status === "active");
  const suspendues = ecoles.filter((e) => e.status === "suspendue");
  const totalEleves = ecoles.reduce((s, e) => s + e.effectif_eleves, 0);
  const totalEns = ecoles.reduce((s, e) => s + e.effectif_enseignants, 0);
  const revenu = actives.reduce((s, e) => s + e.revenu_mensuel, 0);

  const kpis = [
    { label: "Écoles totales", value: ecoles.length.toString(), icon: School, color: "text-primary" },
    { label: "Actives", value: actives.length.toString(), icon: CheckCircle2, color: "text-primary" },
    { label: "Suspendues", value: suspendues.length.toString(), icon: PauseCircle, color: "text-destructive" },
    { label: "Élèves (réseau)", value: totalEleves.toLocaleString("fr-FR"), icon: GraduationCap, color: "text-primary" },
    { label: "Enseignants", value: totalEns.toLocaleString("fr-FR"), icon: Users, color: "text-primary" },
    { label: "Revenu mensuel", value: `${(revenu / 1_000_000).toFixed(1)}M FCFA`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <SettingsSection
      title="Tableau de bord — Réseau d'écoles"
      description="Indicateurs consolidés de tous les établissements du réseau."
      icon={<LayoutDashboard className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((k) => (
        {kpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} index={i} />
        ))}
      </div>


      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">Top écoles par effectif</h3>
          <div className="space-y-2">
            {[...ecoles]
              .sort((a, b) => b.effectif_eleves - a.effectif_eleves)
              .slice(0, 5)
              .map((e) => {
                const max = Math.max(...ecoles.map((x) => x.effectif_eleves), 1);
                return (
                  <div key={e.ecole_id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{e.nom}</span>
                      <span className="font-semibold">{e.effectif_eleves} élèves</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(e.effectif_eleves / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
