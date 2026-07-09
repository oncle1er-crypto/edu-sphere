import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Loader2 } from "lucide-react";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useMemo } from "react";

const MONTHS = ["jan", "fév", "mar", "avr", "mai", "jun", "jui", "aoû", "sep", "oct", "nov", "déc"];

export default function ExamsCalendar() {
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const periodeIds = periodLoading || !activeAnnee ? [] : activeAnnee.periodes.map((p) => p.id);
  const { evaluations, loading } = useEvaluations(periodeIds);

  const events = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return evaluations
      .filter((e) => e.date_eval && new Date(e.date_eval) >= new Date(today.getTime() - 30 * 86400000))
      .map((e) => {
        const d = new Date(e.date_eval!);
        return {
          id: e.id,
          jour: d.getDate().toString().padStart(2, "0"),
          mois: MONTHS[d.getMonth()],
          title: `${e.type ?? "Évaluation"} ${e.matiere_nom ?? ""}`.trim(),
          classe: e.classe_nom ?? "—",
          coef: e.coefficient ?? 1,
          bareme: e.bareme ?? 20,
        };
      })
      .sort((a, b) => `${a.mois}${a.jour}`.localeCompare(`${b.mois}${b.jour}`));
  }, [evaluations]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<CalendarRange className='h-5 w-5' />} title={`Calendrier des évaluations (${events.length})`} description="Planning des compositions, devoirs et examens.">
      {events.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucune évaluation planifiée.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {events.map((e) => (
            <Card key={e.id} className="border">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center font-bold">
                  <span className="text-xs">{e.mois}</span>
                  <span className="text-lg leading-none">{e.jour}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{e.title}</p>
                    <Badge variant="secondary" className="text-[10px]">{e.classe}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Barème /{e.bareme} · Coef. {e.coef}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
