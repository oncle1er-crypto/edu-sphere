import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type PresenceRow = Database["public"]["Tables"]["presences"]["Row"];

export interface Presence extends PresenceRow {
  eleve_nom?: string;
  eleve_prenom?: string;
  eleve_matricule?: string;
  classe_nom?: string;
}

export function usePresences() {
  const { ecoleId } = useEcoleId();
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPresences = useCallback(async (classeId: string, date: string) => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("presences")
      .select("*, eleves(nom, prenom, matricule), classes(nom)")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", classeId)
      .eq("date_presence", date)
      .order("created_at");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement présences");
    } else {
      setPresences(
        (data ?? []).map((p: any) => ({
          ...p,
          eleve_nom: p.eleves?.nom,
          eleve_prenom: p.eleves?.prenom,
          eleve_matricule: p.eleves?.matricule,
          classe_nom: p.classes?.nom,
        }))
      );
    }
    setLoading(false);
  }, [ecoleId]);

  const upsertPresence = async (presence: Database["public"]["Tables"]["presences"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("presences")
      .upsert({ ...presence, ecole_id: ecoleId }, { onConflict: "ecole_id,eleve_id,classe_id,date_presence" })
      .select()
      .single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    return data;
  };

  const savePresences = async (items: Database["public"]["Tables"]["presences"]["Insert"][]) => {
    if (!ecoleId || items.length === 0) return;
    const rows = items.map((i) => ({ ...i, ecole_id: ecoleId }));
    const { error } = await supabase.from("presences").upsert(rows);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Présences enregistrées");
    return true;
  };

  return { presences, loading, fetchPresences, upsertPresence, savePresences, ecoleId };
}
