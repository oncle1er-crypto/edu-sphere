import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { buildVariableSlots, timeToMinutes } from "@/lib/timeSlots";

export interface TimetableSettings {
  id?: string;
  ecole_id?: string;
  heure_debut: string;
  heure_fin: string;
  duree_creneau_min: number;
  duree_recreation_min: number;
  recreation_debut: string;
  pause_dej_debut: string;
  pause_dej_fin: string;
  jours_ouvres: "lun-ven" | "lun-sam";
  verrouiller_apres_publication: boolean;
  auto_generer_remplacements: boolean;
  notif_modifications: boolean;
  notif_remplacements: boolean;
  notif_annulations: boolean;
  canal_email: boolean;
  canal_sms: boolean;
  canal_push: boolean;
  modele_message: string;
}

export const DEFAULT_SETTINGS: TimetableSettings = {
  heure_debut: "08:00",
  heure_fin: "17:00",
  duree_creneau_min: 60,
  duree_recreation_min: 15,
  recreation_debut: "09:45",
  pause_dej_debut: "12:00",
  pause_dej_fin: "14:00",
  jours_ouvres: "lun-ven",
  verrouiller_apres_publication: true,
  auto_generer_remplacements: false,
  notif_modifications: true,
  notif_remplacements: true,
  notif_annulations: true,
  canal_email: true,
  canal_sms: true,
  canal_push: false,
  modele_message:
    "Bonjour, le cours de {{matiere}} du {{date}} à {{heure}} pour la classe {{classe}} est {{action}}. Cordialement.",
};

const TABLE = "parametres_emploi_temps" as const;

/** Retourne la liste ordonnée des jours ouvrés (1=Lundi … 6=Samedi). */
export function joursFromSettings(s: Pick<TimetableSettings, "jours_ouvres">): number[] {
  return s.jours_ouvres === "lun-sam" ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
}

type SettingsForBreaks = Pick<
  TimetableSettings,
  "pause_dej_debut" | "pause_dej_fin" | "recreation_debut" | "duree_recreation_min"
>;

/**
 * Liste des pauses positionnées dans le temps (récréation + déjeuner),
 * triées, avec un libellé. La récréation est omise si sa durée est à 0
 * (réglage désactivé). Utilisé pour le découpage des créneaux ET pour
 * l'affichage d'une ligne de pause dans la vue hebdomadaire.
 */
export function breaksFromSettings(
  s: SettingsForBreaks
): Array<{ label: string; debut: string; fin: string }> {
  const toStr = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  const out: Array<{ label: string; debut: string; fin: string }> = [];
  if (s.duree_recreation_min > 0) {
    const debut = timeToMinutes(s.recreation_debut);
    out.push({ label: "Récréation", debut: toStr(debut), fin: toStr(debut + s.duree_recreation_min) });
  }
  out.push({ label: "Pause déjeuner", debut: s.pause_dej_debut.slice(0, 5), fin: s.pause_dej_fin.slice(0, 5) });
  return out.sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Construit la liste des créneaux horaires à partir de la config, en
 * raccourcissant les créneaux qui touchent la récréation ou la pause
 * déjeuner (voir src/lib/timeSlots.ts). */
export function slotsFromSettings(
  s: Pick<TimetableSettings, "heure_debut" | "heure_fin" | "duree_creneau_min"> & SettingsForBreaks
): Array<{ debut: string; fin: string }> {
  const toStr = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  const duree = Math.max(15, s.duree_creneau_min || 60);
  const breaks = breaksFromSettings(s).map((b) => ({
    start: timeToMinutes(b.debut),
    end: timeToMinutes(b.fin),
  }));
  const slots = buildVariableSlots(timeToMinutes(s.heure_debut), timeToMinutes(s.heure_fin), duree, breaks);
  return slots.map((sl) => ({ debut: toStr(sl.start), fin: toStr(sl.end) }));
}

export function useTimetableSettings() {
  const { ecoleId } = useEcoleId();
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .maybeSingle();
    if (error) {
      console.error(error);
    }
    if (data) setSettings(data as any as TimetableSettings);
    else setSettings({ ...DEFAULT_SETTINGS });
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch?: Partial<TimetableSettings>) => {
      if (!ecoleId) return false;
      setSaving(true);
      const payload = { ...settings, ...(patch ?? {}), ecole_id: ecoleId };
      const { error } = await supabase
        .from(TABLE as any)
        .upsert(payload as any, { onConflict: "ecole_id" });
      setSaving(false);
      if (error) {
        toast.error("Erreur enregistrement : " + messageErreurBase(error));
        return false;
      }
      toast.success("Paramètres enregistrés");
      if (patch) setSettings((s) => ({ ...s, ...patch }));
      return true;
    },
    [ecoleId, settings]
  );

  const update = useCallback((patch: Partial<TimetableSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  return { settings, loading, saving, load, save, update };
}
