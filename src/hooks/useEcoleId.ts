import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns the ecole_id of the currently authenticated user.
 * All multi-tenant queries must use this to scope data.
 */
export function useEcoleId() {
  const { user } = useAuth();
  const [ecoleId, setEcoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("profiles")
      .select("ecole_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setEcoleId(data?.ecole_id ?? null);
        setLoading(false);
      });
  }, [user]);

  return { ecoleId, loading };
}
