import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns the ecole_id of the currently authenticated user.
 * All multi-tenant queries must use this to scope data.
 *
 * Le résultat est mis en cache et PARTAGÉ par tous les appelants : sans cela,
 * chaque montage (garde de route, layout, page…) relançait la requête
 * `profiles` et repassait par un état `loading`, ce qui remplaçait la page par
 * un écran d'attente à chaque changement de section.
 *
 * `loading` reste vrai tant que :
 *   - l'auth n'a pas fini d'hydrater la session (évite la race condition
 *     au premier rendu où `user` est null puis devient défini),
 *   - OU la requête `profiles` n'a pas encore résolu.
 */
export function useEcoleId() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && !!user?.id;

  const { data, isPending } = useQuery({
    queryKey: ["ecole-id", user?.id ?? null],
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ecole_id")
        .eq("id", user!.id)
        .maybeSingle();
      return ((data as any)?.ecole_id as string | null) ?? null;
    },
  });

  return {
    ecoleId: enabled ? (data ?? null) : null,
    loading: enabled ? isPending : authLoading,
  };
}
