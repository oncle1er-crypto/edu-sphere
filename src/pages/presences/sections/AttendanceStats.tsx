import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const trend = [
  { mois: "Sept", taux: 96 },
  { mois: "Oct", taux: 95 },
  { mois: "Nov", taux: 94 },
  { mois: "Déc", taux: 92 },
  { mois: "Jan", taux: 95 },
  { mois: "Fév", taux: 93 },
  { mois: "Mars", taux: 94 },
  { mois: "Avril", taux: 95 },
];

const motifs = [
  { label: "Maladie", part: 52 },
  { label: "Voyage / famille", part: 18 },
  { label: "RDV médical", part: 14 },
  { label: "Non justifié", part: 11 },
  { label: "Autre", part: 5 },
];

export default function AttendanceStats() {
  return (
    <div className="space-y-6">
      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-6">
          <h3 className="font-bold font-display text-primary mb-4">Évolution du taux de présence (année)</h3>
          <div className="space-y-3">
            {trend.map((t) => (
              <div key={t.mois}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{t.mois}</span>
                  <span className="text-muted-foreground">{t.taux}%</span>
                </div>
                <Progress value={t.taux} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-6">
          <h3 className="font-bold font-display text-primary mb-4">Répartition des motifs d'absence</h3>
          <div className="space-y-3">
            {motifs.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">{m.part}%</span>
                </div>
                <Progress value={m.part} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
