import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface SanctionPresence {
  id: string;
  ecole_id: string;
  eleve_id: string;
  classe_id: string | null;
  annee_id: string | null;
  type: string;
  motif: string | null;
  nb_absences_declencheur: number | null;
  date_sanction: string;
  notifie_parents: boolean;
  enregistre_par: string | null;
  created_at: string;
}

export function useSanctionsPresences() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [sanctions, setSanctions] = useState<SanctionPresence[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSanctions = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sanctions_presences" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_sanction", { ascending: false });
    if (error) console.error(error);
    setSanctions((data as any as SanctionPresence[]) ?? []);
    setLoading(false);
  }, [ecoleId]);

  const addSanction = useCallback(async (params: {
    eleve_id: string;
    classe_id?: string;
    annee_id?: string;
    type: string;
    motif?: string;
    nb_absences_declencheur?: number;
  }) => {
    if (!ecoleId || !user) return false;
    const { error } = await supabase
      .from("sanctions_presences" as any)
      .insert({
        ...params,
        ecole_id: ecoleId,
        enregistre_par: user.id,
      } as any);
    if (error) { toast.error("Erreur enregistrement sanction"); console.error(error); return false; }
    toast.success("Sanction enregistrée");
    await fetchSanctions();
    return true;
  }, [ecoleId, user, fetchSanctions]);

  return { sanctions, loading, fetchSanctions, addSanction };
}
