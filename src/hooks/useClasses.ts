import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type ClasseRow = Database["public"]["Tables"]["classes"]["Row"];

export interface Classe extends ClasseRow {
  cycle_nom?: string;
  effectif?: number;
  prof_nom?: string;
}

export function useClasses(anneeId?: string) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, cycleIds } = useNiveau();
  const [classesRaw, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtrage par niveau (Primaire = Maternelle + Primaire / Secondaire)
  const classes = useMemo(() => {
    if (isGlobal) return classesRaw;
    const set = new Set(cycleIds);
    return classesRaw.filter((c) => c.cycle_id && set.has(c.cycle_id));
  }, [classesRaw, isGlobal, cycleIds]);

  const fetchClasses = useCallback(async () => {
    if (!ecoleId) return;
    if (anneeId === "") { setClasses([]); setLoading(false); return; }
    setLoading(true);

    let q = supabase
      .from("classes")
      .select("*, cycles(nom), enseignants(nom, prenom), eleves(count)")
      .eq("ecole_id", ecoleId);
    if (anneeId) q = q.eq("annee_id", anneeId);
    const { data, error } = await q.order("nom");

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
  }, [ecoleId, anneeId]);

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
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Classe créée");
    await fetchClasses();
    return data;
  };

  return { classes, loading: loading || ecoleLoading, fetchClasses, addClass, ecoleId };
}
