import { Globe } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LocalizationSettings() {
  return (
    <SettingsSection
      title="Localisation & affichage"
      description="Langue, fuseau horaire et formats régionaux."
      icon={<Globe className="h-5 w-5" />}
    >
      <FieldRow label="Langue de l'interface">
        <Select defaultValue="fr">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Fuseau horaire">
        <Select defaultValue="africa-douala">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="africa-douala">Africa/Douala (UTC+1)</SelectItem>
            <SelectItem value="africa-dakar">Africa/Dakar (UTC+0)</SelectItem>
            <SelectItem value="africa-lagos">Africa/Lagos (UTC+1)</SelectItem>
            <SelectItem value="europe-paris">Europe/Paris (UTC+1/+2)</SelectItem>
            <SelectItem value="america-new_york">America/New_York (UTC-5)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Format de date">
        <Select defaultValue="dd-mm-yyyy">
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dd-mm-yyyy">JJ/MM/AAAA (24/04/2026)</SelectItem>
            <SelectItem value="mm-dd-yyyy">MM/JJ/AAAA (04/24/2026)</SelectItem>
            <SelectItem value="yyyy-mm-dd">AAAA-MM-JJ (2026-04-24)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Format de l'heure">
        <Select defaultValue="24h">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 heures (14:30)</SelectItem>
            <SelectItem value="12h">12 heures (2:30 PM)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Premier jour de la semaine">
        <Select defaultValue="monday">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monday">Lundi</SelectItem>
            <SelectItem value="sunday">Dimanche</SelectItem>
            <SelectItem value="saturday">Samedi</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Séparateur décimal">
        <Select defaultValue="comma">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="comma">Virgule (1 234,56)</SelectItem>
            <SelectItem value="dot">Point (1,234.56)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </SettingsSection>
  );
}
