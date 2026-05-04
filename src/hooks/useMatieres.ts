import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type MatiereRow = Database["public"]["Tables"]["matieres"]["Row"];

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

  return { matieres, loading: loading || ecoleLoading, fetchMatieres, addMatiere, ecoleId };
}
