import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";

export default function ClassesConfig() {
  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module"
      description="Paramètres généraux pour la gestion des classes."
    >
      <FieldRow label="Format code classe"><Input defaultValue="CL-{###}" /></FieldRow>
      <FieldRow label="Capacité par défaut"><Input type="number" defaultValue={40} className="w-32" /></FieldRow>
      <FieldRow label="Effectif minimum (alerte)"><Input type="number" defaultValue={15} className="w-32" /></FieldRow>
      <FieldRow label="Heure de début des cours"><Input type="time" defaultValue="08:00" className="w-32" /></FieldRow>
      <FieldRow label="Heure de fin des cours"><Input type="time" defaultValue="17:00" className="w-32" /></FieldRow>
      <FieldRow label="Durée d'un cours (min)"><Input type="number" defaultValue={55} className="w-32" /></FieldRow>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Alerte classe pleine</p>
            <p className="text-xs text-muted-foreground">Bloquer les inscriptions si capacité atteinte</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Détection automatique des conflits d'emploi du temps</p>
            <p className="text-xs text-muted-foreground">Salle, prof ou classe en double</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Cours le samedi</p>
            <p className="text-xs text-muted-foreground">Activer la 6ème journée d'enseignement</p>
          </div>
          <Switch />
        </div>
      </div>
    </SettingsSection>
  );
}
