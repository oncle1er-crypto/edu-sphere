import { SettingsSection } from "@/components/settings/SettingsSection";
import { UtensilsCrossed } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function CanteenStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Cantine"
      description="Repas servis, abonnements et coût moyen."
      icon={<UtensilsCrossed className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Repas servis (mois)" value="18 240" icon={UtensilsCrossed} />
                <KpiCard label="Abonnés actifs" value="942" icon={UtensilsCrossed} color="text-accent" />
                <KpiCard label="Coût moyen / repas" value="850 FCFA" icon={UtensilsCrossed} />
                <KpiCard label="Taux de fréquentation" value="68%" icon={UtensilsCrossed} color="text-accent" />
              </div>
              <BarChart
                title="Abonnés cantine par école"
                data={list.map((e, i) => ({ label: e.nom, value: Math.round(e.effectif_eleves * (0.3 + ((i * 7) % 4) / 10)) }))}
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
