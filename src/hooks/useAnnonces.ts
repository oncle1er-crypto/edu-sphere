import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Row = Database["public"]["Tables"]["annonces"]["Row"];

export function useAnnonces() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [annonces, setAnnonces] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnonces = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("annonces")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("Erreur chargement annonces"); }
    else { setAnnonces(data ?? []); }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchAnnonces();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchAnnonces]);

  const addAnnonce = async (annonce: Database["public"]["Tables"]["annonces"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("annonces").insert({ ...annonce, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Annonce créée");
    await fetchAnnonces();
    return data;
  };

  const updateAnnonce = async (id: string, updates: Database["public"]["Tables"]["annonces"]["Update"]) => {
    const { error } = await supabase.from("annonces").update(updates).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    await fetchAnnonces();
    return true;
  };

  const deleteAnnonce = async (id: string) => {
    const { error } = await supabase.from("annonces").delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Annonce supprimée");
    await fetchAnnonces();
    return true;
  };

  return { annonces, loading: loading || ecoleLoading, fetchAnnonces, addAnnonce, updateAnnonce, deleteAnnonce, ecoleId };
}
