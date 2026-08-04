import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import { toast } from "sonner";
import { sortEleves } from "@/lib/sortEleves";


import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type EleveRow = Database["public"]["Tables"]["eleves"]["Row"];

export interface Eleve extends EleveRow {
  classe_nom?: string | null;
  cycle_nom?: string | null;
}

export function useEleves(anneeId?: string) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, classeIds } = useNiveau();
  const [elevesRaw, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtrage par niveau (Primaire = Maternelle + Primaire / Secondaire)
  const eleves = useMemo(() => {
    if (isGlobal || !classeIds) return elevesRaw;
    const set = new Set(classeIds);
    return elevesRaw.filter((e) => e.classe_id && set.has(e.classe_id));
  }, [elevesRaw, isGlobal, classeIds]);

  const fetchEleves = useCallback(async () => {
    if (!ecoleId) return;
    // Si l'appelant a explicitement passé une année vide, on n'affiche rien.
    if (anneeId === "") { setEleves([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from("eleves")
      .select("*, classes(nom, cycles(nom))")
      .eq("ecole_id", ecoleId);
    if (anneeId) q = q.eq("annee_id", anneeId);
    const { data, error } = await q.order("nom");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement élèves");
    } else {
      setEleves(
        sortEleves(
          (data ?? []).map((e: any) => ({
            ...e,
            classe_nom: e.classes?.nom ?? null,
            cycle_nom: e.classes?.cycles?.nom ?? null,
          }))
        )
      );

    }
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchEleves();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchEleves]);

  // Realtime subscription disabled for privacy: streaming full student rows
  // to every school member would leak sensitive personal data (dates of
  // birth, national IDs, addresses…). Callers refresh via fetchEleves()
  // after their own mutations.

  const addEleve = async (eleve: Database["public"]["Tables"]["eleves"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("eleves")
      .insert({ ...eleve, ecole_id: ecoleId })
      .select()
      .single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Élève inscrit avec succès");
    await fetchEleves();
    return data;
  };

  const updateEleve = async (id: string, updates: Database["public"]["Tables"]["eleves"]["Update"]) => {
    const { error } = await supabase.from("eleves").update(updates).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Élève mis à jour");
    await fetchEleves();
    return true;
  };

  const deleteEleve = async (id: string) => {
    const { error } = await supabase.from("eleves").delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Élève supprimé");
    await fetchEleves();
    return true;
  };

  return { eleves, loading: loading || ecoleLoading, fetchEleves, addEleve, updateEleve, deleteEleve, ecoleId };
}
