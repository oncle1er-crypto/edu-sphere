import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ClasseRow = Database["public"]["Tables"]["classes"]["Row"];

export interface Classe extends ClasseRow {
  cycle_nom?: string;
  effectif?: number;
  prof_nom?: string;
}

export function useClasses() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("classes")
      .select("*, cycles(nom), enseignants(nom, prenom), eleves(count)")
      .eq("ecole_id", ecoleId)
      .order("nom");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement classes");
      setLoading(false);
      return;
    }

    setClasses(
      (data ?? []).map((c: any) => ({
        ...c,
        cycle_nom: c.cycles?.nom ?? "",
        effectif: c.eleves?.[0]?.count ?? 0,
        prof_nom: c.enseignants ? `${c.enseignants.nom} ${c.enseignants.prenom}` : "",
      }))
    );
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchClasses();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchClasses]);

  const addClass = async (classe: Database["public"]["Tables"]["classes"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("classes")
      .insert({ ...classe, ecole_id: ecoleId })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Classe créée");
    await fetchClasses();
    return data;
  };

  return { classes, loading: loading || ecoleLoading, fetchClasses, addClass, ecoleId };
}
