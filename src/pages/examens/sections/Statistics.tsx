import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Users, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

const tone: Record<string, string> = {
  success: "bg-accent/15 text-primary",
  danger: "bg-destructive/15 text-destructive",
  primary: "bg-primary/15 text-primary",
};

export default function Statistics() {
  const { ecoleId } = useEcoleId();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    reussite: number; echec: number; effectif: number; tres_bien: number;
    distribution: { tranche: string; pct: number }[];
  } | null>(null);

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      setLoading(true);
      const { data: bulletins } = await supabase
        .from("bulletins_audit")
        .select("moyenne, mention")
        .eq("ecole_id", ecoleId);

      const rows = (bulletins ?? []).filter((b: any) => b.moyenne != null);
      const total = rows.length;
      const buckets = { tb: 0, b: 0, ab: 0, pa: 0, ins: 0 };
      let reussite = 0;
      let tres_bien = 0;
      for (const r of rows) {
        const m = Number(r.moyenne);
        if (m >= 10) reussite++;
        if (m >= 16) { buckets.tb++; tres_bien++; }
        else if (m >= 14) buckets.b++;
        else if (m >= 12) buckets.ab++;
        else if (m >= 10) buckets.pa++;
        else buckets.ins++;
      }
      const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
      setData({
        reussite: pct(reussite),
        echec: pct(total - reussite),
        effectif: total,
        tres_bien,
        distribution: [
          { tranche: "16 - 20 (Très bien)", pct: pct(buckets.tb) },
          { tranche: "14 - 16 (Bien)", pct: pct(buckets.b) },
          { tranche: "12 - 14 (Assez bien)", pct: pct(buckets.ab) },
          { tranche: "10 - 12 (Passable)", pct: pct(buckets.pa) },
          { tranche: "0 - 10 (Insuffisant)", pct: pct(buckets.ins) },
        ],
      });
      setLoading(false);
    })();
  }, [ecoleId]);

  if (loading || !data) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const stats = [
    { label: "Taux de réussite global", value: `${data.reussite}%`, icon: TrendingUp, tone: "success" },
    { label: "Taux d'échec", value: `${data.echec}%`, icon: TrendingDown, tone: "danger" },
    { label: "Bulletins évalués", value: data.effectif.toLocaleString("fr-FR"), icon: Users, tone: "primary" },
    { label: "Mentions Très Bien", value: data.tres_bien.toString(), icon: TrendingUp, tone: "success" },
  ];

  return (
    <SettingsSection icon={<BarChart3 className='h-5 w-5' />} title="Statistiques & analyses" description="Vue d'ensemble des performances.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="border">
            <CardContent className="p-5">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tone[s.tone]}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">{s.label}</p>
              <p className="text-xl font-bold font-display text-primary mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border">
        <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
          <h4 className="font-bold font-display text-primary">Distribution des moyennes</h4>
        </div>
        <CardContent className="p-6 space-y-4">
          {data.effectif === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Aucun bulletin enregistré.</p>
          ) : data.distribution.map((d) => (
            <div key={d.tranche}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{d.tranche}</span>
                <span className="text-muted-foreground">{d.pct}%</span>
              </div>
              <Progress value={d.pct} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
