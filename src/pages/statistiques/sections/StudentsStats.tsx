import { SettingsSection } from "@/components/settings/SettingsSection";
import { GraduationCap } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function StudentsStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Élèves"
      description="Effectifs, répartition et évolution par établissement."
      icon={<GraduationCap className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          const total = list.reduce((s, e) => s + e.effectif_eleves, 0);
          const moyenne = list.length ? Math.round(total / list.length) : 0;
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total élèves" value={total.toLocaleString("fr-FR")} icon={GraduationCap} />
                <KpiCard label="Moyenne / école" value={moyenne} icon={GraduationCap} color="text-accent" />
                <KpiCard label="Garçons (est.)" value={Math.round(total * 0.51).toLocaleString("fr-FR")} icon={GraduationCap} />
                <KpiCard label="Filles (est.)" value={Math.round(total * 0.49).toLocaleString("fr-FR")} icon={GraduationCap} color="text-accent" />
              </div>
              <BarChart
                title="Effectifs par école"
                data={list.map((e) => ({ label: e.nom, value: e.effectif_eleves }))}
              />
              <BarChart
                title="Effectifs par cycle (estimation)"
                data={[
                  { label: "Maternelle", value: Math.round(total * 0.18) },
                  { label: "Primaire", value: Math.round(total * 0.42) },
                  { label: "Collège", value: Math.round(total * 0.25) },
                  { label: "Lycée", value: Math.round(total * 0.15) },
                ]}
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
