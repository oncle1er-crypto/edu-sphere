import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StatsConfig() {
  const [auto, setAuto] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [currency, setCurrency] = useState("FCFA");
  const [emails, setEmails] = useState(true);

  return (
    <SettingsSection
      title="Configuration des statistiques"
      description="Paramètres d'agrégation, devise et envoi automatique des rapports."
      icon={<Settings2 className="h-5 w-5" />}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Calcul automatique</Label>
            <p className="text-xs text-muted-foreground">Recalculer les KPIs en temps réel.</p>
          </div>
          <Switch checked={auto} onCheckedChange={setAuto} />
        </div>
        <div>
          <Label>Période d'agrégation par défaut</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Quotidienne</SelectItem>
              <SelectItem value="weekly">Hebdomadaire</SelectItem>
              <SelectItem value="monthly">Mensuelle</SelectItem>
              <SelectItem value="quarterly">Trimestrielle</SelectItem>
              <SelectItem value="yearly">Annuelle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Devise d'affichage</Label>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Rapports par email</Label>
            <p className="text-xs text-muted-foreground">Envoi automatique à la direction du réseau.</p>
          </div>
          <Switch checked={emails} onCheckedChange={setEmails} />
        </div>
      </div>
    </SettingsSection>
  );
}
