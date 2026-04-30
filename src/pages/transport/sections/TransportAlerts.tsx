import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertTriangle, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const alerts = [
  { ligne: "C", vehicule: "DK-9012-EF", message: "Retard estimé +12 min — embouteillage Pikine.", time: "il y a 4 min", level: "warning" },
  { ligne: "A", vehicule: "DK-1234-AB", message: "Arrivée à l'école dans 5 min.", time: "il y a 1 min", level: "info" },
  { ligne: "D", vehicule: "DK-3456-GH", message: "Hors service — en maintenance.", time: "il y a 2 h", level: "danger" },
  { ligne: "B", vehicule: "DK-5678-CD", message: "Tournée matin terminée. Tous les élèves déposés.", time: "il y a 1 h", level: "success" },
];

const colors: Record<string, string> = {
  warning: "text-accent",
  info: "text-primary",
  danger: "text-destructive",
  success: "text-primary",
};

export default function TransportAlerts() {
  return (
    <SettingsSection
      title="Alertes temps réel"
      description="Notifications en direct depuis la flotte."
      icon={<AlertTriangle className="h-5 w-5" />}
      hideSave
    >
      <div className="grid gap-3">
        {alerts.map((a, i) => (
          <Card key={i} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${colors[a.level]}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> Ligne {a.ligne}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">{a.vehicule}</span>
                </div>
                <p className="text-sm">{a.message}</p>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" /> {a.time}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
