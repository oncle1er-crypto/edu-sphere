import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";

export default function ExamsConfig() {
  return (
    <SettingsSection icon={Settings2} title="Configuration" description="Paramètres généraux du module évaluations.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Système de notation</Label>
          <Select defaultValue="20">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Sur 20 (système français)</SelectItem>
              <SelectItem value="100">Sur 100 (pourcentage)</SelectItem>
              <SelectItem value="gpa">GPA (système américain)</SelectItem>
              <SelectItem value="lettre">Lettres (A, B, C, D, E)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Note de passage</Label>
          <Input type="number" defaultValue="10" />
        </div>

        <div className="space-y-2">
          <Label>Périodicité</Label>
          <Select defaultValue="trim">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trim">Trimestres (3 par an)</SelectItem>
              <SelectItem value="sem">Semestres (2 par an)</SelectItem>
              <SelectItem value="quad">Quadrimestres (4 par an)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Méthode de calcul des moyennes</Label>
          <Select defaultValue="coef">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="coef">Moyenne pondérée (coefficients)</SelectItem>
              <SelectItem value="simple">Moyenne arithmétique simple</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Affichage du rang sur le bulletin</p>
            <p className="text-xs text-muted-foreground">Position de l'élève dans la classe</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Mentions automatiques</p>
            <p className="text-xs text-muted-foreground">TB / B / AB selon la moyenne</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Notification SMS aux parents</p>
            <p className="text-xs text-muted-foreground">À la publication des bulletins</p>
          </div>
          <Switch />
        </div>
      </div>
    </SettingsSection>
  );
}
