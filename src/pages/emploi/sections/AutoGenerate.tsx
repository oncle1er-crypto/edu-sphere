import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Wand2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AutoGenerate() {
  return (
    <SettingsSection
      title="Génération automatique"
      description="L'algorithme construit l'emploi du temps en respectant les contraintes."
      icon={<Wand2 className="h-5 w-5" />}
    >
      <FieldRow label="Période de génération" hint="Trimestre ou année.">
        <Select defaultValue="t2">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="t1">Trimestre 1</SelectItem>
            <SelectItem value="t2">Trimestre 2</SelectItem>
            <SelectItem value="t3">Trimestre 3</SelectItem>
            <SelectItem value="annee">Année complète</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Heures par jour max" hint="Limite par classe.">
        <Input type="number" defaultValue={6} />
      </FieldRow>

      <FieldRow label="Pause déjeuner obligatoire">
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <span className="text-sm text-muted-foreground">12h - 14h</span>
        </div>
      </FieldRow>

      <FieldRow label="Respecter disponibilités profs">
        <Switch defaultChecked />
      </FieldRow>

      <FieldRow label="Éviter heures isolées">
        <Switch defaultChecked />
      </FieldRow>

      <FieldRow label="Regrouper matières lourdes le matin">
        <Switch defaultChecked />
      </FieldRow>

      <div className="border-t pt-4 flex flex-col sm:flex-row gap-3">
        <Button className="gap-2"><Play className="h-4 w-4" /> Lancer la génération</Button>
        <Button variant="outline">Simulation</Button>
      </div>

      <div className="bg-muted/40 rounded-lg p-4 text-sm">
        <p className="font-semibold mb-2">Dernière génération : 28 avril 2026</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>✓ 42 classes planifiées sur 45</li>
          <li>✓ 0 conflit de salles</li>
          <li>⚠ 3 contraintes profs non respectées</li>
        </ul>
      </div>
    </SettingsSection>
  );
}
