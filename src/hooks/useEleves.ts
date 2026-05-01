import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export interface Eleve {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  photo_url: string | null;
  statut: string;
  classe_id: string | null;
  annee_id: string | null;
  ecole_id: string;
  date_inscription: string | null;
  classe_nom?: string;
  cycle_nom?: string;
}

export function useEleves() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEleves = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("eleves")
      .select("*, classes(nom, cycles(nom))")
      .eq("ecole_id", ecoleId)
      .order("nom");

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
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchEleves();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchEleves]);

  const addEleve = async (eleve: Omit<Eleve, "id" | "ecole_id" | "classe_nom" | "cycle_nom">) => {
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

  const updateEleve = async (id: string, updates: Partial<Eleve>) => {
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
