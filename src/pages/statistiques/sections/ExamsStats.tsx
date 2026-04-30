import { SettingsSection } from "@/components/settings/SettingsSection";
import { ClipboardList } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function ExamsStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Examens & notes"
      description="Moyennes générales, taux de réussite et bulletins émis."
      icon={<ClipboardList className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Moyenne réseau" value="13.4 / 20" icon={ClipboardList} color="text-accent" />
                <KpiCard label="Taux de réussite" value="82%" icon={ClipboardList} />
                <KpiCard label="Bulletins émis" value="2 416" icon={ClipboardList} />
                <KpiCard label="Mentions" value="612" icon={ClipboardList} color="text-accent" />
              </div>
              <BarChart
                title="Moyenne générale par école (/20)"
                data={list.map((e, i) => ({ label: e.nom, value: 11 + ((i * 13) % 6) }))}
                unit=" / 20"
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
