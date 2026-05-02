import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EnseignantRow = Database["public"]["Tables"]["enseignants"]["Row"];

export interface Enseignant extends EnseignantRow {
  nb_classes?: number;
}

export function useEnseignants() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnseignants = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("enseignants")
      .select("*, enseignant_matieres(count)")
      .eq("ecole_id", ecoleId)
      .order("nom");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement enseignants");
    } else {
      setEnseignants(
        (data ?? []).map((e: any) => ({
          ...e,
          nb_classes: e.enseignant_matieres?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchEnseignants();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchEnseignants]);

  const addEnseignant = async (e: Database["public"]["Tables"]["enseignants"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("enseignants").insert({ ...e, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Enseignant ajouté");
    await fetchEnseignants();
    return data;
  };

  const updateEnseignant = async (id: string, updates: Database["public"]["Tables"]["enseignants"]["Update"]) => {
    const { error } = await supabase.from("enseignants").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Enseignant mis à jour");
    await fetchEnseignants();
    return true;
  };

  const deleteEnseignant = async (id: string) => {
    const { error } = await supabase.from("enseignants").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Enseignant supprimé");
    await fetchEnseignants();
    return true;
  };

  return { enseignants, loading: loading || ecoleLoading, fetchEnseignants, addEnseignant, updateEnseignant, deleteEnseignant, ecoleId };
}
