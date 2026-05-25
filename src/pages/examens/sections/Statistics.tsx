import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Users } from "lucide-react";

const stats = [
  { label: "Taux de réussite global", value: "78.4%", icon: TrendingUp, tone: "success" },
  { label: "Taux d'échec", value: "12.1%", icon: TrendingDown, tone: "danger" },
  { label: "Effectif évalué", value: "1 248", icon: Users, tone: "primary" },
  { label: "Mentions Très Bien", value: "84", icon: TrendingUp, tone: "success" },
];

const distribution = [
  { tranche: "16 - 20 (Très bien)", value: 12 },
  { tranche: "14 - 16 (Bien)", value: 24 },
  { tranche: "12 - 14 (Assez bien)", value: 28 },
  { tranche: "10 - 12 (Passable)", value: 22 },
  { tranche: "0 - 10 (Insuffisant)", value: 14 },
];

const tone: Record<string, string> = {
  success: "bg-accent/15 text-primary",
  danger: "bg-destructive/15 text-destructive",
  primary: "bg-primary/15 text-primary",
};

export default function Statistics() {
  return (
    <SettingsSection icon={<BarChart3 className='h-5 w-5' />} title="Statistiques & analyses" description="Vue d'ensemble des performances du trimestre.">
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
          {distribution.map((d) => (
            <div key={d.tranche}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{d.tranche}</span>
                <span className="text-muted-foreground">{d.value}%</span>
              </div>
              <Progress value={d.value * 3} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
