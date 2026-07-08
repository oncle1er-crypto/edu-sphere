import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { BellRing, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTimetableSettings } from "@/hooks/useTimetableSettings";

export default function TimetableNotifications() {
  const { settings, loading, saving, save, update } = useTimetableSettings();

  return (
    <SettingsSection
      title="Notifications emploi du temps"
      description="Alertez profs, élèves et parents en cas de changement. Les messages sont envoyés via les canaux activés."
      icon={<BellRing className="h-5 w-5" />}
      hideSave
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <FieldRow label="Notifier les modifications">
            <Switch
              checked={settings.notif_modifications}
              onCheckedChange={(v) => update({ notif_modifications: v })}
            />
          </FieldRow>
          <FieldRow label="Notifier les remplacements">
            <Switch
              checked={settings.notif_remplacements}
              onCheckedChange={(v) => update({ notif_remplacements: v })}
            />
          </FieldRow>
          <FieldRow label="Notifier les annulations de cours">
            <Switch
              checked={settings.notif_annulations}
              onCheckedChange={(v) => update({ notif_annulations: v })}
            />
          </FieldRow>

          <FieldRow label="Canaux activés" hint="Les envois utilisent les canaux cochés.">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.canal_email}
                  onCheckedChange={(v) => update({ canal_email: v })}
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.canal_sms}
                  onCheckedChange={(v) => update({ canal_sms: v })}
                />
                SMS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.canal_push}
                  onCheckedChange={(v) => update({ canal_push: v })}
                />
                Push
              </label>
            </div>
          </FieldRow>

          <FieldRow label="Modèle de message" hint="Variables : {{matiere}} {{date}} {{heure}} {{classe}} {{action}}">
            <Textarea
              rows={4}
              value={settings.modele_message}
              onChange={(e) => update({ modele_message: e.target.value })}
            />
          </FieldRow>

          <div className="flex justify-end border-t pt-4">
            <Button onClick={() => save()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer les paramètres
            </Button>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
