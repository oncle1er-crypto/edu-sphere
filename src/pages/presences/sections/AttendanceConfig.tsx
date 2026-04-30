import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";

export default function AttendanceConfig() {
  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module Présences"
      description="Règles métier appliquées à tout l'établissement."
    >
      <FieldRow label="Seuil retard (min)" hint="Au-delà : marqué retard">
        <Input type="number" defaultValue={5} className="w-32" />
      </FieldRow>
      <FieldRow label="Seuil absence (min)" hint="Au-delà du retard : marqué absent">
        <Input type="number" defaultValue={30} className="w-32" />
      </FieldRow>
      <FieldRow label="Délai justificatif (jours)"><Input type="number" defaultValue={3} className="w-32" /></FieldRow>
      <FieldRow label="Seuil alerte absences (mois)"><Input type="number" defaultValue={5} className="w-32" /></FieldRow>
      <FieldRow label="Seuil conseil discipline"><Input type="number" defaultValue={10} className="w-32" /></FieldRow>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div><p className="font-medium">Appel obligatoire à chaque séance</p><p className="text-xs text-muted-foreground">Bloque la saisie de notes sans appel</p></div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div><p className="font-medium">Verrouillage de l'appel après 24h</p><p className="text-xs text-muted-foreground">Modification soumise à validation admin</p></div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div><p className="font-medium">Inclure le samedi</p><p className="text-xs text-muted-foreground">Compter les samedis dans les statistiques</p></div>
          <Switch />
        </div>
      </div>
    </SettingsSection>
  );
}
