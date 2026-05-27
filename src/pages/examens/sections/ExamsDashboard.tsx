import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, CheckCircle2, TrendingUp, Award, Loader2 } from "lucide-react";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useCycles } from "@/hooks/useCycles";
import { useMemo } from "react";

const toneMap: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-accent/15 text-primary",
};

export default function ExamsDashboard() {
  const { evaluations, loading } = useEvaluations();
  const { cycles } = useCycles();

  const kpis = useMemo(() => {
    const total = evaluations.length;
    const withNotes = evaluations.filter((e) => (e.nb_notes ?? 0) > 0).length;
    const pct = total > 0 ? Math.round((withNotes / total) * 100) : 0;
    return [
      { label: "Évaluations créées", value: String(total), badge: "Total", tone: "primary", icon: ClipboardList },
      { label: "Notes saisies", value: `${pct}%`, badge: `${withNotes}/${total}`, tone: "success", icon: CheckCircle2 },
    ];
  }, [evaluations]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[k.tone]}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-xs">{k.badge}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold font-display text-primary mt-1">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {evaluations.length === 0 && (
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-8 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-bold font-display text-primary">Aucune évaluation</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Commencez par créer des évaluations dans la section « Évaluations & devoirs ».
            </p>
          </CardContent>
        </Card>
      )}

      {evaluations.length > 0 && (
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h3 className="font-bold font-display text-primary">Dernières évaluations</h3>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y">
              {evaluations.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{e.titre}</p>
                    <p className="text-xs text-muted-foreground">{e.matiere_nom} · {e.classe_nom} · Coef. {e.coefficient}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">
                      {new Date(e.date_eval).toLocaleDateString("fr-FR")}
                    </p>
                    <Badge variant="secondary" className="text-[11px]">{e.type}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
