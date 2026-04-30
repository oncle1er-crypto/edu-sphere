import { SettingsSection } from "@/components/settings/SettingsSection";
import { DollarSign } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function FinanceStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Finances"
      description="Revenus, impayés et trésorerie consolidés."
      icon={<DollarSign className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          const revenu = list.reduce((s, e) => s + e.revenu_mensuel, 0);
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Revenus (mois)" value={`${(revenu / 1_000_000).toFixed(1)}M FCFA`} icon={DollarSign} />
                <KpiCard label="Encaissé" value={`${((revenu * 0.86) / 1_000_000).toFixed(1)}M`} icon={DollarSign} color="text-accent" />
                <KpiCard label="Impayés" value={`${((revenu * 0.14) / 1_000_000).toFixed(1)}M`} icon={DollarSign} color="text-destructive" />
                <KpiCard label="Taux recouvrement" value="86%" icon={DollarSign} color="text-accent" />
              </div>
              <BarChart
                title="Revenus par école (FCFA)"
                data={list.map((e) => ({ label: e.nom, value: e.revenu_mensuel }))}
                format={(v) => `${(v / 1_000_000).toFixed(1)}M`}
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
