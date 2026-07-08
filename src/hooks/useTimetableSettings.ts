import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export interface TimetableSettings {
  id?: string;
  ecole_id?: string;
  heure_debut: string;
  heure_fin: string;
  duree_creneau_min: number;
  duree_recreation_min: number;
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

/** Construit la liste des créneaux horaires (matin + après-midi) à partir de la config. */
export function slotsFromSettings(
  s: Pick<TimetableSettings, "heure_debut" | "heure_fin" | "duree_creneau_min" | "pause_dej_debut" | "pause_dej_fin">
): Array<{ debut: string; fin: string }> {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toStr = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  const out: Array<{ debut: string; fin: string }> = [];
  const dj = toMin(s.heure_debut);
  const df = toMin(s.heure_fin);
  const pauseD = toMin(s.pause_dej_debut);
  const pauseF = toMin(s.pause_dej_fin);
  const duree = Math.max(15, s.duree_creneau_min || 60);
  let cur = dj;
  while (cur + duree <= df) {
    // Skip la pause déjeuner
    if (cur >= pauseD && cur < pauseF) {
      cur = pauseF;
      continue;
    }
    if (cur + duree > pauseD && cur < pauseD) {
      cur = pauseF;
      continue;
    }
    out.push({ debut: toStr(cur), fin: toStr(cur + duree) });
    cur += duree;
  }
  return out;
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
        toast.error("Erreur enregistrement : " + error.message);
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
