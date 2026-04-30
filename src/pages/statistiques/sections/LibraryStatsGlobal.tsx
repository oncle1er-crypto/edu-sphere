import { SettingsSection } from "@/components/settings/SettingsSection";
import { Library } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function LibraryStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Bibliothèque"
      description="Fonds documentaire, emprunts et retards."
      icon={<Library className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Ouvrages" value="12 480" icon={Library} />
                <KpiCard label="Emprunts (mois)" value="1 856" icon={Library} color="text-accent" />
                <KpiCard label="Lecteurs actifs" value="743" icon={Library} />
                <KpiCard label="Retards" value="62" icon={Library} color="text-destructive" />
              </div>
              <BarChart
                title="Emprunts par école"
                data={list.map((e, i) => ({ label: e.nom, value: 200 + ((i * 137) % 600) }))}
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
