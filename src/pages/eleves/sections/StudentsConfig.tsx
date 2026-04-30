import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";

export default function StudentsConfig() {
  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module"
      description="Paramètres généraux pour la gestion des élèves."
    >
      <FieldRow label="Format du matricule" hint="Préfixe + année + numéro">
        <Input defaultValue="ELV-{YYYY}-{####}" />
      </FieldRow>
      <FieldRow label="Âge minimum (Maternelle PS)">
        <Input type="number" defaultValue={3} className="w-32" />
      </FieldRow>
      <FieldRow label="Âge maximum (Lycée)">
        <Input type="number" defaultValue={20} className="w-32" />
      </FieldRow>
      <FieldRow label="Capacité par défaut d'une classe">
        <Input type="number" defaultValue={40} className="w-32" />
      </FieldRow>
      <FieldRow label="Documents obligatoires à l'inscription">
        <Select defaultValue="3"><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 documents</SelectItem>
            <SelectItem value="3">3 documents</SelectItem>
            <SelectItem value="4">4 documents</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Photo obligatoire à l'inscription</p>
            <p className="text-xs text-muted-foreground">Bloquer si la photo n'est pas téléversée</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Notification SMS aux parents</p>
            <p className="text-xs text-muted-foreground">Inscription, absence, sanction</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Génération automatique du carnet</p>
            <p className="text-xs text-muted-foreground">PDF imprimable après inscription</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Archivage automatique des sortants</p>
            <p className="text-xs text-muted-foreground">Vers la base "Anciens élèves"</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </SettingsSection>
  );
}
