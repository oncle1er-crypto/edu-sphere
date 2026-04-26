import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, CheckCircle2, Clock, TrendingUp, Award, AlertTriangle } from "lucide-react";

const kpis = [
  { label: "Évaluations planifiées", value: "84", change: "Trimestre 2", icon: ClipboardList, tone: "primary" },
  { label: "Notes saisies", value: "76%", change: "+12%", icon: CheckCircle2, tone: "success" },
  { label: "Bulletins en attente", value: "18", change: "À valider", icon: Clock, tone: "warning" },
  { label: "Moyenne générale", value: "13.4 / 20", change: "+0.6", icon: TrendingUp, tone: "primary" },
];

const upcoming = [
  { matiere: "Mathématiques", classe: "Tle C", date: "28 avril", coef: 4, type: "Composition" },
  { matiere: "Français", classe: "3ème A", date: "29 avril", coef: 3, type: "Devoir surveillé" },
  { matiere: "Physique", classe: "1ère D", date: "02 mai", coef: 4, type: "Composition" },
  { matiere: "Histoire-Géo", classe: "6ème B", date: "03 mai", coef: 2, type: "Interrogation" },
];

const progression = [
  { cycle: "Maternelle", value: 95 },
  { cycle: "Primaire", value: 88 },
  { cycle: "Collège", value: 74 },
  { cycle: "Lycée", value: 68 },
  { cycle: "Université", value: 52 },
];

const tone: Record<string, string> = {
  success: "bg-accent/15 text-accent",
  warning: "bg-orange-500/15 text-orange-600",
  primary: "bg-primary/15 text-primary",
  danger: "bg-destructive/15 text-destructive",
};

export default function ExamsDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone[k.tone]}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-xs">{k.change}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold font-display text-primary mt-1">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h3 className="font-bold font-display text-primary">Avancement des saisies</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Par cycle scolaire</p>
          </div>
          <CardContent className="p-6 space-y-4">
            {progression.map((p) => (
              <div key={p.cycle}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{p.cycle}</span>
                  <span className="text-muted-foreground">{p.value}%</span>
                </div>
                <Progress value={p.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h3 className="font-bold font-display text-primary">Prochaines évaluations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">7 prochains jours</p>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y">
              {upcoming.map((u, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.matiere} · {u.classe}</p>
                    <p className="text-xs text-muted-foreground">{u.type} · Coef. {u.coef}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{u.date}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Award className="h-3 w-3 text-accent" /> planifié
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold font-display text-primary">18 bulletins à valider</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Conseil de classe Tle C prévu vendredi. Pensez à clôturer les saisies avant 18h.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
