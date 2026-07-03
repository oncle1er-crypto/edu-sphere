import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EvalRow = Database["public"]["Tables"]["evaluations"]["Row"];

export interface Evaluation extends EvalRow {
  classe_nom?: string | null;
  matiere_nom?: string | null;
  enseignant_nom?: string | null;
  periode_nom?: string | null;
  nb_notes?: number;
  nb_eleves?: number;
}

export function useEvaluations(periodeIds?: string[]) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const scopedProvided = periodeIds !== undefined;
  const periodeKey = (periodeIds ?? []).join("|");

  const fetchEvaluations = useCallback(async () => {
    if (!ecoleId) return;
    if (scopedProvided && (periodeIds!.length === 0)) {
      setEvaluations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("evaluations")
      .select("*, classes(nom, annee_id), matieres(nom), enseignants(nom, prenom), periodes(nom), notes(count)")
      .eq("ecole_id", ecoleId);
    if (scopedProvided) query = query.in("periode_id", periodeIds!);
    query = query.order("date_eval", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Erreur chargement évaluations");
    } else {
      setEvaluations(
        (data ?? []).map((e: any) => ({
          ...e,
          classe_nom: e.classes?.nom ?? null,
          matiere_nom: e.matieres?.nom ?? null,
          enseignant_nom: e.enseignants
            ? `${e.enseignants.prenom ?? ""} ${e.enseignants.nom}`.trim()
            : null,
          periode_nom: e.periodes?.nom ?? null,
          nb_notes: e.notes?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }, [ecoleId, scopedProvided, periodeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchEvaluations();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchEvaluations]);

  const addEvaluation = async (
    eval_data: Database["public"]["Tables"]["evaluations"]["Insert"]
  ) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("evaluations")
      .insert({ ...eval_data, ecole_id: ecoleId })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Évaluation créée");
    await fetchEvaluations();
    return data;
  };

  const updateEvaluation = async (
    id: string,
    updates: Database["public"]["Tables"]["evaluations"]["Update"]
  ) => {
    const { error } = await supabase.from("evaluations").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Évaluation mise à jour");
    await fetchEvaluations();
    return true;
  };

  const deleteEvaluation = async (id: string) => {
    // Delete associated notes first
    await supabase.from("notes").delete().eq("evaluation_id", id);
    const { error } = await supabase.from("evaluations").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Évaluation supprimée");
    await fetchEvaluations();
    return true;
  };

  return { evaluations, loading: loading || ecoleLoading, fetchEvaluations, addEvaluation, updateEvaluation, deleteEvaluation, ecoleId, anneeId };
}
