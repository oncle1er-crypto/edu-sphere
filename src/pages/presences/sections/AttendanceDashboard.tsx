import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, UserX, CalendarClock, FileText, BellRing, TrendingDown } from "lucide-react";

const kpis = [
  { label: "Taux de présence (jour)", value: "94,8%", icon: ClipboardCheck, hint: "Objectif : 95%" },
  { label: "Absents aujourd'hui", value: "67", icon: UserX, hint: "sur 1 287 élèves" },
  { label: "Retards de la semaine", value: "142", icon: CalendarClock, hint: "+12 vs semaine -1" },
  { label: "Justificatifs en attente", value: "23", icon: FileText, hint: "à valider" },
  { label: "SMS parents envoyés", value: "318", icon: BellRing, hint: "cette semaine" },
  { label: "Élèves > 5 absences", value: "11", icon: TrendingDown, hint: "alerte rouge" },
];

const byClass = [
  { name: "6ème A", rate: 97 },
  { name: "5ème B", rate: 92 },
  { name: "4ème C", rate: 89 },
  { name: "3ème A", rate: 95 },
  { name: "Terminale S", rate: 88 },
];

export default function AttendanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
                  <p className="text-2xl font-extrabold font-display text-primary mt-2">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
