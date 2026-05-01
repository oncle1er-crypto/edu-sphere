import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";

export default function CardsConfig() {
  return (
    <SettingsSection
      title="Configuration des cartes"
      description="Format, validité par défaut et règles d'émission."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <FieldRow label="Format par défaut" hint="CR80 = format CB pour imprimante à badges.">
        <Select defaultValue="cr80">
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cr80">CR80 (85.6 × 54 mm)</SelectItem>
            <SelectItem value="a4_10">Planche A4 (10 cartes)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Validité élève (par défaut)" hint="Format AAAA-MM-JJ">
        <Input defaultValue="2026-07-31" className="w-48" />
      </FieldRow>

      <FieldRow label="Validité personnel (par défaut)">
        <Input defaultValue="2026-08-31" className="w-48" />
      </FieldRow>

      <FieldRow label="Validité visiteur" hint="Toujours du jour même">
        <Switch defaultChecked />
      </FieldRow>

      <FieldRow label="Renouvellement automatique" hint="À chaque changement d'année scolaire active">
        <Switch defaultChecked />
      </FieldRow>

      <FieldRow label="Invalider l'ancien QR au renouvellement" hint="Recommandé pour la sécurité">
        <Switch defaultChecked />
      </FieldRow>

      <FieldRow label="Numérotation lecteur (bibliothèque)" hint="Préfixe du n° de lecteur">
        <Input defaultValue="LEC-" className="w-32" />
      </FieldRow>
    </SettingsSection>
  );
}
