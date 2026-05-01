import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";

export default function SubjectsConfig() {
  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration des matières"
      description="Paramètres généraux du module Matières."
    >
      <FieldRow label="Échelle de notation par défaut">
        <Select defaultValue="20">
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="20">/ 20 (MENA)</SelectItem>
            <SelectItem value="10">/ 10</SelectItem>
            <SelectItem value="100">/ 100</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Note minimale de passage">
        <Input type="number" defaultValue={10} className="w-24" />
      </FieldRow>
      <FieldRow label="Coefficient par défaut">
        <Input type="number" defaultValue={1} className="w-24" />
      </FieldRow>
      <FieldRow label="Activer les matières optionnelles" hint="Espagnol, Informatique, etc.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Inclure l'éducation religieuse" hint="Catéchèse — établissement catholique">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Afficher le code matière sur les bulletins">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Verrouiller la modification des coefficients" hint="Réservé à l'administration">
        <Switch />
      </FieldRow>
    </SettingsSection>
  );
}
