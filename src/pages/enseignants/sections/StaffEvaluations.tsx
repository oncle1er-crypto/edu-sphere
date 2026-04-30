import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award } from "lucide-react";

const evals = [
  { membre: "Sidibé Amadou", note: 18, mention: "Excellent", criteres: { pedagogie: 19, ponctualite: 18, relation: 17 } },
  { membre: "Touré Fatoumata", note: 17, mention: "Très bien", criteres: { pedagogie: 18, ponctualite: 17, relation: 16 } },
  { membre: "Diarra Mamadou", note: 14, mention: "Bien", criteres: { pedagogie: 15, ponctualite: 13, relation: 14 } },
  { membre: "Sanogo Aïssata", note: 16, mention: "Bien", criteres: { pedagogie: 16, ponctualite: 17, relation: 15 } },
];

const colorFor = (n: number) => n >= 16 ? "bg-emerald-500" : n >= 12 ? "bg-amber-500" : "bg-destructive";

export default function StaffEvaluations() {
  return (
    <SettingsSection
      icon={<Award className="h-5 w-5" />}
      title="Évaluations annuelles"
      description="Évaluation des performances pédagogiques et professionnelles."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {evals.map((e) => (
          <Card key={e.membre} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold font-display">{e.membre}</h4>
                <div className="text-right">
                  <p className="text-2xl font-extrabold font-display text-primary">{e.note}/20</p>
                  <Badge variant="secondary" className="text-[10px]">{e.mention}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(e.criteres).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize">{k}</span>
                      <span className="font-semibold">{v}/20</span>
                    </div>
                    <Progress value={(v / 20) * 100} className={`h-1.5 [&>div]:${colorFor(v)}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
