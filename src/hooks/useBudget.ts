import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface LigneBudget {
  id: string;
  libelle: string;
  type: string;
  montant_prevu: number;
  montant_realise: number;
  source: string | null;
}

export interface AnneeOption {
  id: string;
  libelle: string;
  statut: string;
}

export interface GenerationResult {
  ok?: boolean;
  lignes?: number;
  effectif?: number;
  scolarite_prevue?: number;
  services_prevus?: number;
  vacances_prevues?: number;
}

export function useBudget(anneeIdParam?: string | null) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { anneeId: anneeActiveId, loading: anneeLoading } = useAnneeId();
  const [lignes, setLignes] = useState<LigneBudget[]>([]);
  const [annees, setAnnees] = useState<AnneeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const anneeId = anneeIdParam ?? anneeActiveId;

  useEffect(() => {
    if (!ecoleId) return;
    let cancelled = false;
    supabase
      .from("annees_scolaires")
      .select("id, libelle, statut, debut")
      .eq("ecole_id", ecoleId)
      .order("debut", { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setAnnees(data.map((a) => ({ id: a.id, libelle: a.libelle, statut: a.statut })));
      });
    return () => { cancelled = true; };
  }, [ecoleId]);

  const fetch = useCallback(async () => {
    if (!ecoleId || !anneeId) return;
    setLoading(true);

    const { error: refreshError } = await supabase.rpc("rafraichir_budget_realise", {
      _ecole_id: ecoleId,
      _annee_id: anneeId,
    });
    if (refreshError) {
      console.warn("rafraichir_budget_realise:", refreshError.message);
    }

    const { data } = await supabase
      .from("lignes_budget")
      .select("*")
      .eq("ecole_id", ecoleId)
      .eq("annee_id", anneeId)
      .order("type")
      .order("libelle");
    if (data) {
      setLignes(
        data.map((l) => ({
          id: l.id,
          libelle: l.libelle,
          type: l.type,
          source: l.source ?? null,
          montant_prevu: Number(l.montant_prevu),
          montant_realise: Number(l.montant_realise),
        })),
      );
    }
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => {
    if (ecoleLoading || anneeLoading) return;
    if (ecoleId && anneeId) fetch();
    else setLoading(false);
  }, [ecoleLoading, anneeLoading, ecoleId, anneeId, fetch]);

  const addLigne = async (l: Pick<LigneBudget, "libelle" | "type" | "montant_prevu">) => {
    if (!ecoleId || !anneeId) return;
    const { error } = await supabase
      .from("lignes_budget")
      .insert({ ...l, ecole_id: ecoleId, annee_id: anneeId, source: null });
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Ligne budgétaire ajoutée");
    fetch();
  };

  const updateLigne = async (
    id: string,
    updates: Partial<Pick<LigneBudget, "montant_prevu" | "montant_realise">>,
  ) => {
    const { error } = await supabase.from("lignes_budget").update(updates).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    fetch();
  };

  /** Lance la génération du budget prévisionnel. Peut lever une erreur (message brut du serveur). */
  const genererBudget = async (remplacer: boolean): Promise<GenerationResult> => {
    if (!ecoleId || !anneeId) throw new Error("no_context");
    const { data, error } = await supabase.rpc("generer_budget_previsionnel", {
      _ecole_id: ecoleId,
      _annee_id: anneeId,
      _remplacer: remplacer,
    });
    if (error) throw error;
    await fetch();
    return (data ?? {}) as GenerationResult;
  };

  const recettes = lignes.filter((l) => l.type === "recette");
  const depenses = lignes.filter((l) => l.type === "depense");
  const sum = (arr: LigneBudget[], key: "montant_prevu" | "montant_realise") =>
    arr.reduce((s, l) => s + Number(l[key]), 0);

  const recettesPrevues = sum(recettes, "montant_prevu");
  const recettesReelles = sum(recettes, "montant_realise");
  const depensesPrevues = sum(depenses, "montant_prevu");
  const depensesReelles = sum(depenses, "montant_realise");

  return {
    lignes,
    recettes,
    depenses,
    annees,
    anneeId,
    anneeActiveId,
    loading: loading || ecoleLoading || anneeLoading,
    addLigne,
    updateLigne,
    genererBudget,
    refetch: fetch,
    ecoleId,
    recettesPrevues,
    recettesReelles,
    depensesPrevues,
    depensesReelles,
    soldePrevisionnel: recettesPrevues - depensesPrevues,
    soldeReel: recettesReelles - depensesReelles,
  };
}
