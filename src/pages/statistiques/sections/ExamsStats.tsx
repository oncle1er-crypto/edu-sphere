import { SettingsSection } from "@/components/settings/SettingsSection";
import { ClipboardList, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function ExamsStats() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [stats, setStats] = useState({ evaluations: 0, notes: 0, moyenne: 0, parMatiere: [] as { label: string; value: number }[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    Promise.all([
      supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
      supabase.from("notes").select("note, evaluations(matieres(nom))").eq("ecole_id", ecoleId).not("note", "is", null),
    ]).then(([evRes, nRes]) => {
      const notes = (nRes.data ?? []).filter((n: any) => n.note !== null);
      const avg = notes.length > 0 ? notes.reduce((s: number, n: any) => s + Number(n.note), 0) / notes.length : 0;

      const parMat: Record<string, { sum: number; count: number }> = {};
      notes.forEach((n: any) => {
        const mat = n.evaluations?.matieres?.nom ?? "Autre";
        if (!parMat[mat]) parMat[mat] = { sum: 0, count: 0 };
        parMat[mat].sum += Number(n.note);
        parMat[mat].count += 1;
      });

      setStats({
        evaluations: evRes.count ?? 0,
        notes: notes.length,
        moyenne: Math.round(avg * 10) / 10,
        parMatiere: Object.entries(parMat).map(([label, v]) => ({ label, value: Math.round((v.sum / v.count) * 10) / 10 })).sort((a, b) => b.value - a.value),
      });
      setLoading(false);
    });
  }, [ecoleId]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Statistiques — Examens & notes" description="Moyennes, évaluations et résultats." icon={<ClipboardList className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Évaluations" value={stats.evaluations} icon={ClipboardList} />
        <KpiCard label="Notes saisies" value={stats.notes.toLocaleString("fr-FR")} icon={ClipboardList} color="text-primary" />
        <KpiCard label="Moyenne générale" value={`${stats.moyenne} / 20`} icon={ClipboardList} />
        <KpiCard label="Réussite (≥10)" value={stats.notes > 0 ? "—" : "—"} icon={ClipboardList} color="text-primary" />
      </div>
      {stats.parMatiere.length > 0 && <BarChart title="Moyenne par matière (/20)" data={stats.parMatiere.slice(0, 10)} unit=" / 20" />}
    </SettingsSection>
  );
}
