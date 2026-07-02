import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

import type { Database } from "@/integrations/supabase/types";

type EleveRow = Database["public"]["Tables"]["eleves"]["Row"];

export interface Eleve extends EleveRow {
  classe_nom?: string | null;
  cycle_nom?: string | null;
}

export function useEleves(anneeId?: string) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEleves = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    let q = supabase
      .from("eleves")
      .select("*, classes(nom, cycles(nom))")
      .eq("ecole_id", ecoleId);
    if (anneeId) q = q.eq("annee_id", anneeId);
    const { data, error } = await q.order("nom");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement élèves");
    } else {
      setEleves(
        (data ?? []).map((e: any) => ({
          ...e,
          classe_nom: e.classes?.nom ?? null,
          cycle_nom: e.classes?.cycles?.nom ?? null,
        }))
      );
    }
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchEleves();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchEleves]);

  // Realtime subscription
  useEffect(() => {
    if (!ecoleId) return;
    const channel = supabase
      .channel(`eleves-realtime-${ecoleId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eleves", filter: `ecole_id=eq.${ecoleId}` },
        () => { fetchEleves(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ecoleId, fetchEleves]);

  const addEleve = async (eleve: Database["public"]["Tables"]["eleves"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("eleves")
      .insert({ ...eleve, ecole_id: ecoleId })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Élève inscrit avec succès");
    await fetchEleves();
    return data;
  };

  const updateEleve = async (id: string, updates: Database["public"]["Tables"]["eleves"]["Update"]) => {
    const { error } = await supabase.from("eleves").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Élève mis à jour");
    await fetchEleves();
    return true;
  };

  const deleteEleve = async (id: string) => {
    const { error } = await supabase.from("eleves").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Élève supprimé");
    await fetchEleves();
    return true;
  };

  return { eleves, loading: loading || ecoleLoading, fetchEleves, addEleve, updateEleve, deleteEleve, ecoleId };
}
