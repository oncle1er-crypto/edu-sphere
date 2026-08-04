import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type LivreRow = Database["public"]["Tables"]["livres"]["Row"];

export function useLivres() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [livres, setLivres] = useState<LivreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLivres = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("livres")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("titre");
    if (error) { console.error(error); toast.error("Erreur chargement livres"); }
    else { setLivres(data ?? []); }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchLivres();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchLivres]);

  const addLivre = async (livre: Database["public"]["Tables"]["livres"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("livres").insert({ ...livre, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Livre ajouté");
    await fetchLivres();
    return data;
  };

  const updateLivre = async (id: string, updates: Database["public"]["Tables"]["livres"]["Update"]) => {
    const { error } = await supabase.from("livres").update(updates).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Livre mis à jour");
    await fetchLivres();
    return true;
  };

  const deleteLivre = async (id: string) => {
    const { error } = await supabase.from("livres").delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Livre supprimé");
    await fetchLivres();
    return true;
  };

  return { livres, loading: loading || ecoleLoading, fetchLivres, addLivre, updateLivre, deleteLivre, ecoleId };
}
