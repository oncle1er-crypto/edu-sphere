import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";

export default function StaffConfig() {
  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module"
      description="Paramètres généraux pour la gestion du personnel."
    >
      <FieldRow label="Format matricule enseignant"><Input defaultValue="ENS-{####}" /></FieldRow>
      <FieldRow label="Format matricule administratif"><Input defaultValue="ADM-{####}" /></FieldRow>
      <FieldRow label="Heures hebdomadaires (CDI)"><Input type="number" defaultValue={24} className="w-32" /></FieldRow>
      <FieldRow label="Taux charges sociales (%)"><Input type="number" defaultValue={15} className="w-32" /></FieldRow>
      <FieldRow label="Jour de paie mensuel"><Input type="number" defaultValue={28} className="w-32" /></FieldRow>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Bulletin de paie automatique</p>
            <p className="text-xs text-muted-foreground">Génération PDF chaque fin de mois</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Notification fin de contrat</p>
            <p className="text-xs text-muted-foreground">Alerte 30 jours avant l'échéance</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Évaluation annuelle obligatoire</p>
            <p className="text-xs text-muted-foreground">À chaque fin d'année scolaire</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </SettingsSection>
  );
}
