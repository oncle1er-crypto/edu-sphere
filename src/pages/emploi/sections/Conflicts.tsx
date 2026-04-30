import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const conflicts = [
  { type: "Salle", severity: "Critique", desc: "Salle 12 réservée par 6A et 5B mardi 10h-11h.", action: "Réaffecter" },
  { type: "Enseignant", severity: "Critique", desc: "M. Diop assigné à 2 classes simultanément jeudi 14h.", action: "Corriger" },
  { type: "Volume", severity: "Avertissement", desc: "6ème B : seulement 4h de Maths au lieu de 5h.", action: "Compléter" },
  { type: "Charge", severity: "Avertissement", desc: "Mme Sow dépasse 22h/semaine.", action: "Réduire" },
];

export default function Conflicts() {
  return (
    <SettingsSection
      title="Conflits & alertes"
      description="Liste des incohérences à résoudre."
      icon={<AlertTriangle className="h-5 w-5" />}
      hideSave
    >
      <div className="space-y-3">
        {conflicts.map((c, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${c.severity === "Critique" ? "text-destructive" : "text-accent"}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{c.type}</span>
                <Badge variant={c.severity === "Critique" ? "destructive" : "secondary"}>{c.severity}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
            <Button size="sm" variant="outline">{c.action}</Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>Dernière vérification : il y a 5 minutes</span>
      </div>
    </SettingsSection>
  );
}
