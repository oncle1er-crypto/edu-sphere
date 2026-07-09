import { SettingsSection } from "@/components/settings/SettingsSection";
import { GraduationCap, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { STATUTS_ACTIFS } from "@/lib/eleveStatus";

export default function StudentsStats() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [data, setData] = useState({ total: 0, garcons: 0, filles: 0, parCycle: [] as { label: string; value: number }[], parClasse: [] as { label: string; value: number }[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    supabase.from("eleves").select("id, sexe, classe_id, classes(nom, cycles(nom))").eq("ecole_id", ecoleId).in("statut", STATUTS_ACTIFS as unknown as string[]).then(({ data: eleves }) => {
      const list = eleves ?? [];
      const garcons = list.filter((e: any) => e.sexe === "M").length;
      const filles = list.filter((e: any) => e.sexe === "F").length;

      const cycleCount: Record<string, number> = {};
      const classeCount: Record<string, number> = {};
      list.forEach((e: any) => {
        const cycle = e.classes?.cycles?.nom ?? "Non défini";
        const classe = e.classes?.nom ?? "Non affecté";
        cycleCount[cycle] = (cycleCount[cycle] ?? 0) + 1;
        classeCount[classe] = (classeCount[classe] ?? 0) + 1;
      });

      setData({
        total: list.length,
        garcons,
        filles,
        parCycle: Object.entries(cycleCount).map(([label, value]) => ({ label, value })),
        parClasse: Object.entries(classeCount).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      });
      setLoading(false);
    });
  }, [ecoleId]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Statistiques — Élèves" description="Effectifs, répartition par cycle et par classe." icon={<GraduationCap className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total élèves" value={data.total.toLocaleString("fr-FR")} icon={GraduationCap} />
        <KpiCard label="Garçons" value={data.garcons.toLocaleString("fr-FR")} icon={GraduationCap} />
        <KpiCard label="Filles" value={data.filles.toLocaleString("fr-FR")} icon={GraduationCap} color="text-primary" />
        <KpiCard label="Taux filles" value={data.total > 0 ? `${Math.round((data.filles / data.total) * 100)}%` : "—"} icon={GraduationCap} color="text-primary" />
      </div>
      {data.parCycle.length > 0 && <BarChart title="Effectifs par cycle" data={data.parCycle} />}
      {data.parClasse.length > 0 && <BarChart title="Effectifs par classe" data={data.parClasse.slice(0, 15)} />}
    </SettingsSection>
  );
}
