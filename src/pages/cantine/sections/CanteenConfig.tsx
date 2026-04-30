import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CanteenConfig() {
  return (
    <SettingsSection
      title="Configuration"
      description="Paramètres généraux de la cantine."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <FieldRow label="Prix repas standard (FCFA)">
        <Input type="number" defaultValue={500} />
      </FieldRow>
      <FieldRow label="Prix abonnement mensuel (FCFA)">
        <Input type="number" defaultValue={12000} />
      </FieldRow>
      <FieldRow label="Prix abonnement trimestriel (FCFA)">
        <Input type="number" defaultValue={30000} />
      </FieldRow>
      <FieldRow label="Capacité max par service">
        <Input type="number" defaultValue={350} />
      </FieldRow>
      <FieldRow label="Devise">
        <Select defaultValue="xof">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="xof">FCFA (XOF)</SelectItem>
            <SelectItem value="eur">Euro (EUR)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Auto-générer les factures mensuelles">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Alertes seuil de stock">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Notifier les parents en cas d'allergie">
        <Switch defaultChecked />
      </FieldRow>
    </SettingsSection>
  );
}
