import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function LibraryConfig() {
  return (
    <SettingsSection
      title="Configuration"
      description="Règles d'emprunt et de pénalités."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <FieldRow label="Durée d'emprunt élève (jours)">
        <Input type="number" defaultValue={14} />
      </FieldRow>
      <FieldRow label="Durée d'emprunt enseignant (jours)">
        <Input type="number" defaultValue={30} />
      </FieldRow>
      <FieldRow label="Nb max emprunts simultanés (élève)">
        <Input type="number" defaultValue={2} />
      </FieldRow>
      <FieldRow label="Nb max emprunts simultanés (enseignant)">
        <Input type="number" defaultValue={5} />
      </FieldRow>
      <FieldRow label="Pénalité par jour de retard (FCFA)">
        <Input type="number" defaultValue={100} />
      </FieldRow>
      <FieldRow label="Format des cotes" hint="ex: L-001, M-128">
        <Input defaultValue="X-000" />
      </FieldRow>
      <FieldRow label="Suspendre le lecteur après X retards">
        <Input type="number" defaultValue={3} />
      </FieldRow>
      <FieldRow label="Notifier 2 jours avant retour">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Notifier les retards aux parents">
        <Switch defaultChecked />
      </FieldRow>
    </SettingsSection>
  );
}
