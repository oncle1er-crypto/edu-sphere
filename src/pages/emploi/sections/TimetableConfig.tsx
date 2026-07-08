import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTimetableSettings } from "@/hooks/useTimetableSettings";

export default function TimetableConfig() {
  const { settings, loading, saving, save, update } = useTimetableSettings();

  return (
    <SettingsSection
      title="Configuration"
      description="Paramètres de planification appliqués à la vue hebdomadaire et à la génération automatique."
      icon={<Settings2 className="h-5 w-5" />}
      hideSave
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <FieldRow label="Heure de début" hint="Premier créneau de la journée.">
            <Input
              type="time"
              value={settings.heure_debut}
              onChange={(e) => update({ heure_debut: e.target.value })}
            />
          </FieldRow>

          <FieldRow label="Heure de fin">
            <Input
              type="time"
              value={settings.heure_fin}
              onChange={(e) => update({ heure_fin: e.target.value })}
            />
          </FieldRow>

          <FieldRow label="Durée d'un créneau (min)">
            <Input
              type="number"
              min={15}
              max={180}
              step={5}
              value={settings.duree_creneau_min}
              onChange={(e) => update({ duree_creneau_min: parseInt(e.target.value) || 60 })}
            />
          </FieldRow>

          <FieldRow label="Durée des récréations (min)">
            <Input
              type="number"
              min={0}
              max={60}
              value={settings.duree_recreation_min}
              onChange={(e) => update({ duree_recreation_min: parseInt(e.target.value) || 0 })}
            />
          </FieldRow>

          <FieldRow label="Pause déjeuner — début">
            <Input
              type="time"
              value={settings.pause_dej_debut}
              onChange={(e) => update({ pause_dej_debut: e.target.value })}
            />
          </FieldRow>

          <FieldRow label="Pause déjeuner — fin">
            <Input
              type="time"
              value={settings.pause_dej_fin}
              onChange={(e) => update({ pause_dej_fin: e.target.value })}
            />
          </FieldRow>

          <FieldRow label="Jours ouvrés">
            <Select
              value={settings.jours_ouvres}
              onValueChange={(v) => update({ jours_ouvres: v as "lun-ven" | "lun-sam" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lun-ven">Lundi → Vendredi</SelectItem>
                <SelectItem value="lun-sam">Lundi → Samedi</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Verrouiller après publication" hint="Empêche les modifications hors administrateur.">
            <Switch
              checked={settings.verrouiller_apres_publication}
              onCheckedChange={(v) => update({ verrouiller_apres_publication: v })}
            />
          </FieldRow>

          <FieldRow label="Auto-générer remplacements" hint="Suggère automatiquement un remplaçant disponible.">
            <Switch
              checked={settings.auto_generer_remplacements}
              onCheckedChange={(v) => update({ auto_generer_remplacements: v })}
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
