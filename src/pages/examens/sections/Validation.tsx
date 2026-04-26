import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";

const periods = [
  { nom: "Trimestre 1 — 2024/2025", verrouille: true },
  { nom: "Trimestre 2 — 2024/2025", verrouille: false },
  { nom: "Trimestre 3 — 2024/2025", verrouille: false },
  { nom: "Examen blanc BAC", verrouille: true },
];

export default function Validation() {
  return (
    <SettingsSection
      icon={ShieldCheck}
      title="Validation & verrouillage"
      description="Verrouillez les périodes de saisie pour empêcher toute modification."
    >
      <div className="space-y-3">
        {periods.map((p, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${p.verrouille ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{p.nom}</p>
                  <p className="text-xs text-muted-foreground">{p.verrouille ? "Saisies clôturées" : "Saisies ouvertes"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={p.verrouille} />
                <Button size="sm" variant="outline">Détails</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
