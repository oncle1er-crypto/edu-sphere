import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";

export function useDocumentsCountByEleve() {
  const { ecoleId } = useEcoleId();
  const [countByEleve, setCountByEleve] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents_eleves")
      .select("eleve_id")
      .eq("ecole_id", ecoleId);
    if (!error && data) {
      const m = new Map<string, number>();
      for (const row of data as { eleve_id: string }[]) {
        m.set(row.eleve_id, (m.get(row.eleve_id) ?? 0) + 1);
      }
      setCountByEleve(m);
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { countByEleve, loading, refetch: fetchCounts };
}
