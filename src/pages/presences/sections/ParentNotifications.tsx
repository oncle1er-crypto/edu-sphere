import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BellRing } from "lucide-react";

export default function ParentNotifications() {
  return (
    <SettingsSection
      icon={<BellRing className="h-5 w-5" />}
      title="Notifications aux parents"
      description="Définir les canaux et messages envoyés en cas d'absence ou retard."
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div><p className="font-medium">SMS automatique en cas d'absence</p><p className="text-xs text-muted-foreground">Envoyé après 30 min sans présence</p></div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div><p className="font-medium">Email de récapitulatif hebdomadaire</p><p className="text-xs text-muted-foreground">Tous les vendredis à 18h</p></div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div><p className="font-medium">Notification push (app mobile)</p><p className="text-xs text-muted-foreground">Temps réel pour les parents connectés</p></div>
          <Switch />
        </div>
      </div>

      <FieldRow label="Délai avant envoi (min)"><Input type="number" defaultValue={30} className="w-32" /></FieldRow>
      <FieldRow label="Modèle SMS absence" hint="Variables : {nom}, {classe}, {date}">
        <Textarea rows={3} defaultValue="Bonjour, votre enfant {nom} ({classe}) est absent ce {date}. Merci de justifier l'absence." />
      </FieldRow>
      <FieldRow label="Modèle SMS retard">
        <Textarea rows={3} defaultValue="Votre enfant {nom} ({classe}) est arrivé en retard ce {date}." />
      </FieldRow>
    </SettingsSection>
  );
}
