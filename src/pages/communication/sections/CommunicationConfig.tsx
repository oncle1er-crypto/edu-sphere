import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CommunicationConfig() {
  return (
    <SettingsSection
      title="Configuration"
      description="Paramètres de messagerie et fournisseurs."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <FieldRow label="Adresse expéditeur (Email)">
        <Input type="email" defaultValue="contact@edugest.sn" />
      </FieldRow>
      <FieldRow label="Nom expéditeur">
        <Input defaultValue="EduGest — École" />
      </FieldRow>
      <FieldRow label="Préfixe SMS">
        <Input defaultValue="EDUGEST" />
      </FieldRow>
      <FieldRow label="Fournisseur SMS">
        <Select defaultValue="orange">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="orange">Orange API</SelectItem>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Coût unitaire SMS (FCFA)">
        <Input type="number" defaultValue={25} />
      </FieldRow>
      <FieldRow label="Heure d'envoi optimale">
        <Input type="time" defaultValue="09:00" />
      </FieldRow>
      <FieldRow label="Bloquer envois nuit (20h - 7h)">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Tracker les ouvertures email">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Recharge auto crédit SMS">
        <Switch defaultChecked />
      </FieldRow>
    </SettingsSection>
  );
}
