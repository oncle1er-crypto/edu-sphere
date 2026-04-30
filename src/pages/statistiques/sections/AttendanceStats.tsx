import { SettingsSection } from "@/components/settings/SettingsSection";
import { ClipboardCheck } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { ScopePicker } from "../components/ScopePicker";
import { KpiCard, BarChart } from "../components/StatsPrimitives";

export default function AttendanceStats() {
  const { ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Statistiques — Présences"
      description="Taux d'assiduité et absences par école."
      icon={<ClipboardCheck className="h-5 w-5" />}
      hideSave
    >
      <ScopePicker>
        {(scope) => {
          const list = scope === "all" ? ecoles : ecoles.filter((e) => e.ecole_id === scope);
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Taux présence (mois)" value="94.2%" icon={ClipboardCheck} color="text-accent" />
                <KpiCard label="Absences justifiées" value="312" icon={ClipboardCheck} />
                <KpiCard label="Absences non justifiées" value="87" icon={ClipboardCheck} color="text-destructive" />
                <KpiCard label="Retards cumulés" value="156" icon={ClipboardCheck} />
              </div>
              <BarChart
                title="Taux de présence par école (%)"
                data={list.map((e, i) => ({ label: e.nom, value: 88 + ((i * 7) % 11) }))}
                unit="%"
              />
            </>
          );
        }}
      </ScopePicker>
    </SettingsSection>
  );
}
