import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function TeachersStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Enseignants"
      description="Effectifs, charges horaires et ratios par école."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          const total = list.reduce((s, e) => s + e.effectif_enseignants, 0);
          const eleves = list.reduce((s, e) => s + e.effectif_eleves, 0);
          const ratio = total ? Math.round(eleves / total) : 0;
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total enseignants" value={total} icon={Users} />
                <KpiCard label="Ratio élèves/prof" value={ratio} icon={Users} color="text-accent" />
                <KpiCard label="Heures hebdo (moy.)" value="22h" icon={Users} />
                <KpiCard label="Taux titularisation" value="78%" icon={Users} color="text-accent" />
              </div>
              <BarChart
                title="Enseignants par école"
                data={list.map((e) => ({ label: e.nom, value: e.effectif_enseignants }))}
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
