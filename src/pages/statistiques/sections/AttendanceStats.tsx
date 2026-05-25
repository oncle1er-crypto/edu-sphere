import { SettingsSection } from "@/components/settings/SettingsSection";
import { BookOpen, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { usePresences } from "@/hooks/usePresences";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function AttendanceStats() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [stats, setStats] = useState({ total: 0, presents: 0, absents: 0, retards: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    supabase.from("presences").select("statut").eq("ecole_id", ecoleId).then(({ data }) => {
      const list = data ?? [];
      setStats({
        total: list.length,
        presents: list.filter((p: any) => p.statut === "present").length,
        absents: list.filter((p: any) => p.statut === "absent").length,
        retards: list.filter((p: any) => p.statut === "retard").length,
      });
      setLoading(false);
    });
  }, [ecoleId]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const tauxPresence = stats.total > 0 ? Math.round((stats.presents / stats.total) * 100) : 0;

  return (
    <SettingsSection title="Statistiques — Présences" description="Taux de présence et absences." icon={<BookOpen className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Enregistrements" value={stats.total.toLocaleString("fr-FR")} icon={BookOpen} />
        <KpiCard label="Taux présence" value={`${tauxPresence}%`} icon={BookOpen} color="text-primary" />
        <KpiCard label="Absences" value={stats.absents} icon={BookOpen} color="text-destructive" />
        <KpiCard label="Retards" value={stats.retards} icon={BookOpen} color="text-orange-600" />
      </div>
      <BarChart
        title="Répartition"
        data={[
          { label: "Présents", value: stats.presents },
          { label: "Absents", value: stats.absents },
          { label: "Retards", value: stats.retards },
        ]}
      />
    </SettingsSection>
  );
}
