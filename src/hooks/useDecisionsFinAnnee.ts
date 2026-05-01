import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Decision {
  id: string;
  ecole_id: string;
  annee_id: string;
  eleve_id: string;
  classe_origine_id: string;
  decision: string;
  classe_destination_id: string | null;
  motif: string | null;
  decide_par: string | null;
  created_at: string;
}

export function useDecisionsFinAnnee() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDecisions = useCallback(
    async (anneeId: string) => {
      if (!ecoleId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("decisions_fin_annee" as any)
        .select("*")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId);
      if (error) {
        toast.error("Erreur chargement décisions");
        console.error(error);
      }
      setDecisions((data as any as Decision[]) ?? []);
      setLoading(false);
    },
    [ecoleId]
  );

  const saveDecision = useCallback(
    async (d: {
      annee_id: string;
      eleve_id: string;
      classe_origine_id: string;
      decision: string;
      classe_destination_id?: string | null;
      motif?: string;
    }) => {
      if (!ecoleId || !user) return;
      const payload = {
        ...d,
        ecole_id: ecoleId,
        decide_par: user.id,
      };
      const { error } = await supabase
        .from("decisions_fin_annee" as any)
        .upsert(payload as any, { onConflict: "ecole_id,annee_id,eleve_id" });
      if (error) {
        toast.error("Erreur enregistrement décision");
        console.error(error);
        return false;
      }
      return true;
    },
    [ecoleId, user]
  );

  const saveBulkDecisions = useCallback(
    async (
      anneeId: string,
      items: {
        eleve_id: string;
        classe_origine_id: string;
        decision: string;
        classe_destination_id?: string | null;
        motif?: string;
      }[]
    ) => {
      if (!ecoleId || !user) return false;
      const payload = items.map((d) => ({
        ...d,
        annee_id: anneeId,
        ecole_id: ecoleId,
        decide_par: user.id,
      }));
      const { error } = await supabase
        .from("decisions_fin_annee" as any)
        .upsert(payload as any, { onConflict: "ecole_id,annee_id,eleve_id" });
      if (error) {
        toast.error("Erreur enregistrement en masse");
        console.error(error);
        return false;
      }
      toast.success(`${items.length} décision(s) enregistrée(s)`);
      await fetchDecisions(anneeId);
      return true;
    },
    [ecoleId, user, fetchDecisions]
  );

  return { decisions, loading, fetchDecisions, saveDecision, saveBulkDecisions };
}
