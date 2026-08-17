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
      description="Alertez les parents en cas de remplacement. Seul l'envoi par SMS est actuellement opérationnel."
      icon={<BellRing className="h-5 w-5" />}
      hideSave
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <FieldRow
            label="Notifier les modifications"
            hint="Fonctionnalité prévue, pas encore appliquée : ce réglage n'est relié à aucun événement réel (changement d'horaire ou de salle) pour le moment."
          >
            <Switch
              checked={settings.notif_modifications}
              onCheckedChange={(v) => update({ notif_modifications: v })}
            />
          </FieldRow>
          <FieldRow
            label="Notifier les remplacements"
            hint="Seul réglage actif : un SMS est envoyé aux parents quand un remplacement est confirmé ou annulé (onglet Remplacements)."
          >
            <Switch
              checked={settings.notif_remplacements}
              onCheckedChange={(v) => update({ notif_remplacements: v })}
            />
          </FieldRow>
          <FieldRow
            label="Notifier les annulations de cours"
            hint="Fonctionnalité prévue, pas encore appliquée : ce réglage n'est relié à aucun événement réel pour le moment."
          >
            <Switch
              checked={settings.notif_annulations}
              onCheckedChange={(v) => update({ notif_annulations: v })}
            />
          </FieldRow>

          <FieldRow label="Canaux activés" hint="Seul le SMS est réellement envoyé aujourd'hui. Email et Push ne sont pas encore disponibles dans l'application (aucun service technique connecté) — les activer ici n'a aucun effet.">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={settings.canal_email}
                  onCheckedChange={(v) => update({ canal_email: v })}
                  disabled
                />
                Email <span className="text-[10px]">(bientôt)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.canal_sms}
                  onCheckedChange={(v) => update({ canal_sms: v })}
                />
                SMS
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={settings.canal_push}
                  onCheckedChange={(v) => update({ canal_push: v })}
                  disabled
                />
                Push <span className="text-[10px]">(bientôt)</span>
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
