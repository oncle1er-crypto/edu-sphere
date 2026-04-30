import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Bell, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PushNotifications() {
  return (
    <SettingsSection
      title="Notifications push"
      description="Notifications mobiles via l'app parents/élèves."
      icon={<Bell className="h-5 w-5" />}
      hideSave
    >
      <FieldRow label="Cible">
        <Select defaultValue="parents">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parents">Tous les parents</SelectItem>
            <SelectItem value="eleves">Tous les élèves</SelectItem>
            <SelectItem value="prof">Tous les enseignants</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Titre"><Input placeholder="Bulletin disponible" /></FieldRow>
      <FieldRow label="Corps">
        <Textarea rows={3} placeholder="Le bulletin du T2 de votre enfant est consultable." />
      </FieldRow>
      <FieldRow label="Action">
        <Select defaultValue="open">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Ouvrir l'app</SelectItem>
            <SelectItem value="bulletin">Aller au bulletin</SelectItem>
            <SelectItem value="paiement">Aller au paiement</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <div className="flex gap-3 border-t pt-4">
        <Button className="gap-2"><Send className="h-4 w-4" /> Envoyer la notification</Button>
        <Button variant="outline">Aperçu mobile</Button>
      </div>
    </SettingsSection>
  );
}
