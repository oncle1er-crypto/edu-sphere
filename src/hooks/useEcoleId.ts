import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns the ecole_id of the currently authenticated user.
 * All multi-tenant queries must use this to scope data.
 *
 * `loading` reste vrai tant que :
 *   - l'auth n'a pas fini d'hydrater la session (évite la race condition
 *     au premier rendu où `user` est null puis devient défini),
 *   - OU la requête `profiles` n'a pas encore résolu.
 */
export function useEcoleId() {
  const { user, loading: authLoading } = useAuth();
  const [ecoleId, setEcoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tant que l'auth n'est pas prête, on reste en chargement.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Auth prête mais aucun utilisateur : rien à charger.
    if (!user) {
      setEcoleId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("ecole_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setEcoleId((data as any)?.ecole_id ?? null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  return { ecoleId, loading };
}

