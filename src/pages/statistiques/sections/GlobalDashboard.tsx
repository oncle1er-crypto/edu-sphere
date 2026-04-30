import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, GraduationCap, Users, BookOpen, DollarSign, TrendingUp, School } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function GlobalDashboard() {
  const { ecoles } = useEcoles();
  const actives = ecoles.filter((e) => e.status === "active");
  const eleves = ecoles.reduce((s, e) => s + e.effectif_eleves, 0);
  const ens = ecoles.reduce((s, e) => s + e.effectif_enseignants, 0);
  const classes = ecoles.reduce((s, e) => s + e.nb_classes, 0);
  const revenu = actives.reduce((s, e) => s + e.revenu_mensuel, 0);
  const ratio = ens > 0 ? Math.round(eleves / ens) : 0;

  return (
    <SettingsSection
      title="Vue d'ensemble du réseau"
      description="Indicateurs consolidés multi-tenant."
      icon={<LayoutDashboard className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Écoles actives" value={`${actives.length} / ${ecoles.length}`} icon={School} />
        <KpiCard label="Élèves" value={eleves.toLocaleString("fr-FR")} icon={GraduationCap} />
        <KpiCard label="Enseignants" value={ens.toLocaleString("fr-FR")} icon={Users} color="text-accent" />
        <KpiCard label="Classes" value={classes} icon={BookOpen} />
        <KpiCard label="Revenus mensuels" value={`${(revenu / 1_000_000).toFixed(1)}M FCFA`} icon={DollarSign} />
        <KpiCard label="Ratio élèves / prof" value={ratio} icon={TrendingUp} color="text-accent" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <BarChart
          title="Effectifs élèves par école"
          data={ecoles.map((e) => ({ label: e.nom, value: e.effectif_eleves }))}
        />
        <BarChart
          title="Revenus par école (FCFA)"
          data={ecoles.map((e) => ({ label: e.nom, value: e.revenu_mensuel }))}
          format={(v) => `${(v / 1_000_000).toFixed(1)}M`}
        />
      </div>
    </SettingsSection>
  );
}
