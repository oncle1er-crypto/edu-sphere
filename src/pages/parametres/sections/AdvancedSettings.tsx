import { Cog, AlertTriangle, Trash2 } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const modules = [
  { id: "cantine", label: "Cantine", desc: "Menus et abonnements", active: true },
  { id: "transport", label: "Transport scolaire", desc: "Lignes et passagers", active: true },
  { id: "bibliotheque", label: "Bibliothèque", desc: "Gestion des emprunts", active: false },
  { id: "infirmerie", label: "Infirmerie", desc: "Suivi médical des élèves", active: false },
  { id: "sport", label: "Activités sportives", desc: "Clubs et compétitions", active: false },
  { id: "internat", label: "Internat", desc: "Hébergement scolaire", active: false },
];

export default function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Modules optionnels"
        description="Activez uniquement les modules dont votre établissement a besoin."
        icon={<Cog className="h-5 w-5" />}
        hideSave
      >
        <div className="space-y-2">
          {modules.map((m) => (
            <Card key={m.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-primary">{m.label}</h3>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
              <Switch defaultChecked={m.active} />
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Mode maintenance"
        description="Empêche les utilisateurs (sauf admins) de se connecter pendant les opérations critiques."
        icon={<Cog className="h-5 w-5" />}
      >
        <FieldRow label="Activer le mode maintenance">
          <Switch />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Plan d'abonnement"
        description="Limites de votre plan actuel."
        icon={<Cog className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Élèves</div>
            <div className="text-2xl font-bold text-primary">487 / 1000</div>
            <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: "48.7%" }} />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Stockage</div>
            <div className="text-2xl font-bold text-primary">2.4 / 10 Go</div>
            <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: "24%" }} />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Utilisateurs</div>
            <div className="text-2xl font-bold text-primary">23 / 50</div>
            <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: "46%" }} />
            </div>
          </Card>
        </div>
        <Button className="mt-4">Mettre à niveau mon plan</Button>
      </SettingsSection>

      <Card className="border-destructive/40 bg-destructive/5">
        <div className="px-6 py-5 border-b border-destructive/20 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-destructive">Zone dangereuse</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Actions irréversibles. Procédez avec prudence.
            </p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-4 p-3 border border-destructive/30 rounded-lg">
            <div>
              <h3 className="font-semibold text-sm">Réinitialiser la plateforme</h3>
              <p className="text-xs text-muted-foreground">Supprime toutes les données sauf les paramètres</p>
            </div>
            <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
              Réinitialiser
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 p-3 border border-destructive/30 rounded-lg">
            <div>
              <h3 className="font-semibold text-sm">Supprimer définitivement l'établissement</h3>
              <p className="text-xs text-muted-foreground">Suppression complète du compte et de toutes les données</p>
            </div>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4" />Supprimer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
