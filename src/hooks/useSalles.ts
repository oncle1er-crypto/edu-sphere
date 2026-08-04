import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface Salle {
  id: string;
  ecole_id: string;
  code: string;
  nom: string | null;
  type: string;
  capacite: number;
  batiment: string | null;
  etage: string | null;
  equipements: string[] | null;
  statut: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSalles() {
  const { ecoleId } = useEcoleId();
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSalles = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("salles" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("code");
    if (error) {
      toast.error("Erreur chargement salles");
      console.error(error);
    } else {
      setSalles((data as any) ?? []);
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchSalles(); }, [fetchSalles]);

  const addSalle = useCallback(
    async (s: Partial<Salle>) => {
      if (!ecoleId) return null;
      const { data, error } = await supabase
        .from("salles" as any)
        .insert({ ...s, ecole_id: ecoleId } as any)
        .select()
        .single();
      if (error) { toast.error("Erreur ajout : " + messageErreurBase(error)); return null; }
      toast.success("Salle ajoutée");
      await fetchSalles();
      return data;
    },
    [ecoleId, fetchSalles]
  );

  const updateSalle = useCallback(
    async (id: string, updates: Partial<Salle>) => {
      const { error } = await supabase
        .from("salles" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) { toast.error("Erreur modification"); return false; }
      toast.success("Salle modifiée");
      await fetchSalles();
      return true;
    },
    [fetchSalles]
  );

  const deleteSalle = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("salles" as any).delete().eq("id", id);
      if (error) { toast.error("Erreur suppression"); return false; }
      toast.success("Salle supprimée");
      setSalles((p) => p.filter((s) => s.id !== id));
      return true;
    },
    []
  );

  return { salles, loading, fetchSalles, addSalle, updateSalle, deleteSalle };
}
