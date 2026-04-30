import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function TimetableNotifications() {
  return (
    <SettingsSection
      title="Notifications emploi du temps"
      description="Alertez profs, élèves et parents en cas de changement."
      icon={<BellRing className="h-5 w-5" />}
    >
      <FieldRow label="Notifier les modifications">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Notifier les remplacements">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Notifier les annulations de cours">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Canaux activés" hint="SMS, Email, Notification push">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch defaultChecked /> Email</label>
          <label className="flex items-center gap-2 text-sm"><Switch defaultChecked /> SMS</label>
          <label className="flex items-center gap-2 text-sm"><Switch /> Push</label>
        </div>
      </FieldRow>
      <FieldRow label="Modèle de message">
        <Textarea
          rows={4}
          defaultValue="Bonjour, le cours de {{matiere}} du {{date}} à {{heure}} pour la classe {{classe}} est {{action}}. Cordialement."
        />
      </FieldRow>
    </SettingsSection>
  );
}
