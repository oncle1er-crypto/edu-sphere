import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Justification {
  id: string;
  ecole_id: string;
  eleve_id: string;
  presence_id: string | null;
  motif: string;
  piece_jointe: string | null;
  statut: string;
  traite_par: string | null;
  date_traitement: string | null;
  created_at: string;
  updated_at: string;
}

export function useJustifications() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJustifications = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("justifications" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setJustifications((data as any as Justification[]) ?? []);
    setLoading(false);
  }, [ecoleId]);

  const addJustification = useCallback(async (params: {
    eleve_id: string;
    presence_id?: string;
    motif: string;
    piece_jointe?: string;
  }) => {
    if (!ecoleId) return false;
    const { error } = await supabase
      .from("justifications" as any)
      .insert({ ...params, ecole_id: ecoleId } as any);
    if (error) { toast.error("Erreur ajout justificatif"); console.error(error); return false; }
    toast.success("Justificatif enregistré");
    await fetchJustifications();
    return true;
  }, [ecoleId, fetchJustifications]);

  const updateStatut = useCallback(async (id: string, statut: "acceptee" | "refusee") => {
    if (!ecoleId || !user) return false;
    const { error } = await supabase
      .from("justifications" as any)
      .update({ statut, traite_par: user.id, date_traitement: new Date().toISOString() } as any)
      .eq("id", id)
      .eq("ecole_id", ecoleId);
    if (error) { toast.error("Erreur mise à jour"); console.error(error); return false; }
    toast.success(`Justificatif ${statut === "acceptee" ? "accepté" : "refusé"}`);
    await fetchJustifications();
    return true;
  }, [ecoleId, user, fetchJustifications]);

  return { justifications, loading, fetchJustifications, addJustification, updateStatut };
}
