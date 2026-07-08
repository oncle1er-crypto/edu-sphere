import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type MatiereRow = Database["public"]["Tables"]["matieres"]["Row"];
type MatiereUpdate = Database["public"]["Tables"]["matieres"]["Update"];

export function useMatieres() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [matieres, setMatieres] = useState<MatiereRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatieres = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("matieres")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("nom");
    if (error) { console.error(error); toast.error("Erreur chargement matières"); }
    else setMatieres(data ?? []);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchMatieres();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchMatieres]);

  const addMatiere = async (m: Database["public"]["Tables"]["matieres"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("matieres").insert({ ...m, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Matière ajoutée");
    await fetchMatieres();
    return data;
  };

  const updateMatiere = async (id: string, updates: MatiereUpdate) => {
    const { error } = await supabase.from("matieres").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Matière mise à jour");
    await fetchMatieres();
    return true;
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("matieres").update({ active }).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success(active ? "Matière restaurée" : "Matière archivée");
    await fetchMatieres();
    return true;
  };

  const renameCategorie = async (ancien: string, nouveau: string) => {
    if (!ecoleId) return false;
    const cible = nouveau.trim();
    if (!cible) { toast.error("Nom obligatoire"); return false; }
    if (cible === ancien) return true;
    const { error } = await supabase
      .from("matieres")
      .update({ categorie: cible })
      .eq("ecole_id", ecoleId)
      .eq("categorie", ancien);
    if (error) { toast.error(error.message); return false; }
    toast.success(`Catégorie renommée en « ${cible} »`);
    await fetchMatieres();
    return true;
  };

  const deleteCategorie = async (nom: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase
      .from("matieres")
      .update({ categorie: null })
      .eq("ecole_id", ecoleId)
      .eq("categorie", nom);
    if (error) { toast.error(error.message); return false; }
    toast.success(`Catégorie « ${nom} » supprimée`);
    await fetchMatieres();
    return true;
  };

  return {
    matieres, loading: loading || ecoleLoading,
    fetchMatieres, addMatiere, updateMatiere, toggleActive,
    renameCategorie, deleteCategorie, ecoleId,
  };
}
