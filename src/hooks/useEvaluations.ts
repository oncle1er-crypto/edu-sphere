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

export function useEvaluations() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvaluations = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluations")
      .select("*, classes(nom, annee_id), matieres(nom), enseignants(nom, prenom), periodes(nom), notes(count)")
      .eq("ecole_id", ecoleId)
      .order("date_eval", { ascending: false });

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
  }, [ecoleId]);

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

  return { evaluations, loading: loading || ecoleLoading, fetchEvaluations, addEvaluation, ecoleId, anneeId };
}
