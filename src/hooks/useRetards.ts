import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Retard {
  id: string;
  ecole_id: string;
  eleve_id: string;
  classe_id: string | null;
  annee_id: string | null;
  date_retard: string;
  heure_arrivee: string | null;
  duree_minutes: number | null;
  motif: string | null;
  enregistre_par: string | null;
  created_at: string;
}

export function useRetards() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [retards, setRetards] = useState<Retard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRetards = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("retards" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_retard", { ascending: false })
      .limit(200);
    if (error) console.error(error);
    setRetards((data as any as Retard[]) ?? []);
    setLoading(false);
  }, [ecoleId]);

  const addRetard = useCallback(async (params: {
    eleve_id: string;
    classe_id?: string;
    annee_id?: string;
    date_retard?: string;
    heure_arrivee?: string;
    duree_minutes?: number;
    motif?: string;
  }) => {
    if (!ecoleId || !user) return false;
    const { error } = await supabase
      .from("retards" as any)
      .insert({
        ...params,
        ecole_id: ecoleId,
        enregistre_par: user.id,
        date_retard: params.date_retard || new Date().toISOString().split("T")[0],
      } as any);
    if (error) { toast.error("Erreur enregistrement retard"); console.error(error); return false; }
    toast.success("Retard enregistré");
    await fetchRetards();
    return true;
  }, [ecoleId, user, fetchRetards]);

  return { retards, loading, fetchRetards, addRetard };
}
