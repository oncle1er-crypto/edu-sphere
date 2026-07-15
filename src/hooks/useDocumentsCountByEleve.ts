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
    // Pagination pour dépasser la limite PostgREST de 1000 lignes.
    const rows: { eleve_id: string }[] = [];
    const PAGE = 1000;
    let offset = 0;
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase
        .from("documents_eleves")
        .select("eleve_id")
        .eq("ecole_id", ecoleId)
        .range(offset, offset + PAGE - 1);
      if (error || !data || data.length === 0) break;
      rows.push(...(data as { eleve_id: string }[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const m = new Map<string, number>();
    for (const row of rows) {
      m.set(row.eleve_id, (m.get(row.eleve_id) ?? 0) + 1);
    }
    setCountByEleve(m);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { countByEleve, loading, refetch: fetchCounts };
}
