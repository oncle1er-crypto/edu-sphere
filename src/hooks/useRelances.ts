import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Relance {
  id: string;
  ecole_id: string;
  eleve_id: string;
  parent_id: string | null;
  type: "sms" | "email" | "appel";
  message: string | null;
  envoye_par: string | null;
  date_envoi: string;
  created_at: string;
}

export function useRelances(eleveId?: string) {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [relances, setRelances] = useState<Relance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRelances = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    let query = supabase
      .from("relances")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_envoi", { ascending: false })
      .limit(500);

    if (eleveId) {
      query = query.eq("eleve_id", eleveId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
    }
    setRelances((data as any as Relance[]) ?? []);
    setLoading(false);
  }, [ecoleId, eleveId]);

  const addRelance = useCallback(
    async (params: {
      eleveId: string;
      canal: "SMS" | "Email" | "Appel";
      message: string;
      destinataire: string;
    }) => {
      if (!ecoleId || !user) return null;

      const typeMap: Record<string, string> = { SMS: "sms", Email: "email", Appel: "appel" };

      const { data, error } = await supabase
        .from("relances")
        .insert({
          ecole_id: ecoleId,
          eleve_id: params.eleveId,
          type: typeMap[params.canal] as any,
          message: params.message,
          envoye_par: user.id,
          date_envoi: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) {
        toast.error("Erreur enregistrement relance");
        console.error(error);
        return null;
      }
      // Update local state
      setRelances((prev) => [data as any as Relance, ...prev]);
      return data;
    },
    [ecoleId, user]
  );

  const getRelancesCount = useCallback(
    (eid: string) => relances.filter((r) => r.eleve_id === eid).length,
    [relances]
  );

  const getDerniereRelance = useCallback(
    (eid: string) => relances.find((r) => r.eleve_id === eid),
    [relances]
  );

  return { relances, loading, fetchRelances, addRelance, getRelancesCount, getDerniereRelance };
}

export function formatRelanceDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
