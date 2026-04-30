import { SettingsSection } from "@/components/settings/SettingsSection";
import { ShieldAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const incidents = [
  { date: "28/04/2026", vehicule: "DK-1234-AB", type: "Accrochage léger", gravite: "Faible", desc: "Rétroviseur arraché à l'arrêt Médina.", statut: "Résolu" },
  { date: "22/04/2026", vehicule: "DK-9012-EF", type: "Retard chauffeur", gravite: "Moyenne", desc: "Trajet retour livré avec 25 min de retard.", statut: "Résolu" },
  { date: "30/04/2026", vehicule: "DK-3456-GH", type: "Panne moteur", gravite: "Élevée", desc: "Immobilisation au niveau du rond-point Liberté.", statut: "En cours" },
];

export default function TransportIncidents() {
  return (
    <SettingsSection
      title="Incidents & sécurité"
      description="Suivi des accidents, retards et problèmes techniques."
      icon={<ShieldAlert className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Signaler un incident</Button>
      </div>
      <div className="space-y-3">
        {incidents.map((inc, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
            <ShieldAlert className={`h-5 w-5 mt-0.5 ${inc.gravite === "Élevée" ? "text-destructive" : "text-accent"}`} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{inc.type}</span>
                <Badge variant={inc.gravite === "Élevée" ? "destructive" : "secondary"}>{inc.gravite}</Badge>
                <span className="text-xs text-muted-foreground font-mono">{inc.vehicule}</span>
                <span className="text-xs text-muted-foreground">· {inc.date}</span>
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
