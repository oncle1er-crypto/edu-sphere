import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TimetableConfig() {
  return (
    <SettingsSection
      title="Configuration"
      description="Paramètres de planification et règles métier."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <FieldRow label="Heure de début" hint="Premier créneau de la journée.">
        <Input type="time" defaultValue="08:00" />
      </FieldRow>
      <FieldRow label="Heure de fin">
        <Input type="time" defaultValue="17:00" />
      </FieldRow>
      <FieldRow label="Durée d'un créneau (min)">
        <Input type="number" defaultValue={60} />
      </FieldRow>
      <FieldRow label="Durée des récréations (min)">
        <Input type="number" defaultValue={15} />
      </FieldRow>
      <FieldRow label="Jours ouvrés">
        <Select defaultValue="lun-ven">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lun-ven">Lundi → Vendredi</SelectItem>
            <SelectItem value="lun-sam">Lundi → Samedi</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Verrouiller après publication" hint="Empêche les modifications hors administrateur.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Auto-générer remplacements">
        <Switch />
      </FieldRow>
    </SettingsSection>
  );
}
