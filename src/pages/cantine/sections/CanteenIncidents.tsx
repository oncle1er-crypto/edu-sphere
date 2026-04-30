import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const incidents = [
  { date: "27/04/2026", type: "Allergie", gravite: "Élevée", desc: "Réaction légère détectée chez T. Moussa (arachide).", statut: "Résolu" },
  { date: "25/04/2026", type: "Hygiène", gravite: "Moyenne", desc: "Frigo n°2 remonté à 8°C — produits déplacés.", statut: "Résolu" },
  { date: "29/04/2026", type: "Qualité", gravite: "Faible", desc: "Plainte sur la cuisson du riz.", statut: "En cours" },
];

export default function CanteenIncidents() {
  return (
    <SettingsSection
      title="Incidents cantine"
      description="Suivi des incidents alimentaires, hygiène et qualité."
      icon={<AlertCircle className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Signaler un incident</Button>
      </div>
      <div className="space-y-3">
        {incidents.map((inc, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
            <AlertCircle className={`h-5 w-5 mt-0.5 ${inc.gravite === "Élevée" ? "text-destructive" : "text-accent"}`} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{inc.type}</span>
                <Badge variant={inc.gravite === "Élevée" ? "destructive" : "secondary"}>{inc.gravite}</Badge>
                <span className="text-xs text-muted-foreground">{inc.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{inc.desc}</p>
            </div>
            <Badge variant={inc.statut === "Résolu" ? "default" : "secondary"}>{inc.statut}</Badge>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
