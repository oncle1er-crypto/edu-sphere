import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "directeur"] as any);
      if (!cancel) {
        setIsAdmin((data ?? []).length > 0);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
