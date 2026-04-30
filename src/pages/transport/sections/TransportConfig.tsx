import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TransportConfig() {
  return (
    <SettingsSection
      title="Configuration"
      description="Paramètres généraux du transport scolaire."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <FieldRow label="Tarif mensuel (FCFA)">
        <Input type="number" defaultValue={18000} />
      </FieldRow>
      <FieldRow label="Tarif trimestriel (FCFA)">
        <Input type="number" defaultValue={48000} />
      </FieldRow>
      <FieldRow label="Tarif annuel (FCFA)">
        <Input type="number" defaultValue={150000} />
      </FieldRow>
      <FieldRow label="Tolérance retard (min)">
        <Input type="number" defaultValue={10} />
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
      <FieldRow label="Géolocalisation des bus" hint="Suivi GPS en temps réel.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Alertes parents (montée / descente)">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Auto-générer les factures mensuelles">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Alerte expiration permis chauffeurs">
        <Switch defaultChecked />
      </FieldRow>
    </SettingsSection>
  );
}
