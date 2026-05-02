import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, UserX, CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useClasses } from "@/hooks/useClasses";

export default function AttendanceDashboard() {
  const { ecoleId } = useEcoleId();
  const { classes } = useClasses();
  const [stats, setStats] = useState<{ classe_id: string; present: number; absent: number; retard: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("presences")
        .select("classe_id, statut")
        .eq("ecole_id", ecoleId)
        .eq("date_presence", today);

      if (error) { console.error(error); setLoading(false); return; }

      const map = new Map<string, { present: number; absent: number; retard: number }>();
      (data ?? []).forEach((r: any) => {
        if (!map.has(r.classe_id)) map.set(r.classe_id, { present: 0, absent: 0, retard: 0 });
        const entry = map.get(r.classe_id)!;
        if (r.statut === "present") entry.present++;
        else if (r.statut === "absent") entry.absent++;
        else if (r.statut === "retard") entry.retard++;
      });

      setStats(Array.from(map.entries()).map(([classe_id, v]) => ({ classe_id, ...v })));
      setLoading(false);
    })();
  }, [ecoleId, today]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalPresent = stats.reduce((s, r) => s + r.present, 0);
  const totalAbsent = stats.reduce((s, r) => s + r.absent, 0);
  const totalRetard = stats.reduce((s, r) => s + r.retard, 0);
  const totalAll = totalPresent + totalAbsent + totalRetard;
  const taux = totalAll > 0 ? ((totalPresent / totalAll) * 100).toFixed(1) : "—";

  const kpis = [
    { label: "Taux de présence (jour)", value: `${taux}%`, icon: ClipboardCheck },
    { label: "Absents aujourd'hui", value: totalAbsent.toString(), icon: UserX },
    { label: "Retards aujourd'hui", value: totalRetard.toString(), icon: CalendarClock },
  ];

  const byClass = stats.map((s) => {
    const cl = classes.find((c) => c.id === s.classe_id);
    const total = s.present + s.absent + s.retard;
    return { name: cl?.nom ?? "?", rate: total > 0 ? Math.round((s.present / total) * 100) : 0 };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
                  <p className="text-2xl font-extrabold font-display text-primary mt-2">{k.value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border">
        <CardContent className="p-6">
          <h3 className="font-bold font-display text-primary mb-4">Taux de présence par classe</h3>
          <div className="space-y-4">
            {byClass.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.rate}%</span>
                </div>
                <Progress value={c.rate} />
              </div>
            ))}
            {byClass.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée de présence pour aujourd'hui.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
