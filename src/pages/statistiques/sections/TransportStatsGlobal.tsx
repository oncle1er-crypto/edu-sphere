import { SettingsSection } from "@/components/settings/SettingsSection";
import { Bus } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function TransportStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Transport"
      description="Flotte, lignes et taux de remplissage."
      icon={<Bus className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Véhicules" value="38" icon={Bus} />
                <KpiCard label="Lignes actives" value="22" icon={Bus} color="text-accent" />
                <KpiCard label="Élèves transportés" value="1 124" icon={Bus} />
                <KpiCard label="Taux de remplissage" value="74%" icon={Bus} color="text-accent" />
              </div>
              <BarChart
                title="Élèves transportés par école"
                data={list.map((e, i) => ({ label: e.nom, value: Math.round(e.effectif_eleves * (0.15 + ((i * 5) % 3) / 10)) }))}
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
