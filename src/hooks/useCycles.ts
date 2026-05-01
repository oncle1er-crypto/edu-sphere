import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";

export interface Cycle {
  id: string;
  nom: string;
  ordre: number;
  ecole_id: string;
}

export function useCycles() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    supabase
      .from("cycles")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("ordre")
      .then(({ data }) => {
        setCycles(data ?? []);
        setLoading(false);
      });
  }, [ecoleId]);

  return { cycles, loading: loading || ecoleLoading };
}
