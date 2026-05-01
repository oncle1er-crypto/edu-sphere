import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";

/**
 * Returns the active annee_scolaire id for the current ecole.
 */
export function useAnneeId() {
  const { ecoleId } = useEcoleId();
  const [anneeId, setAnneeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }

    supabase
      .from("annees_scolaires")
      .select("id")
      .eq("ecole_id", ecoleId)
      .eq("statut", "active")
      .limit(1)
      .single()
      .then(({ data }) => {
        setAnneeId(data?.id ?? null);
        setLoading(false);
      });
  }, [ecoleId]);

  return { anneeId, loading };
}
