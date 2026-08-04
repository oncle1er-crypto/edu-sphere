import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface PassageClasse {
  id: string;
  ecole_id: string;
  annee_source: string;
  annee_cible: string;
  plan: any;
  resultat: any;
  eleves_cibles_ids: string[];
  execute_par: string | null;
  execute_le: string;
  annule_le: string | null;
  annule_par: string | null;
}

export interface PlanClasseGroup {
  classe_source_id: string;
  classe_cible_id: string | null;
  action_defaut?: "promu" | "redouble" | "sortant";
  eleves: {
    eleve_id: string;
    action?: "promu" | "redouble" | "exclu" | "sortant";
    classe_cible_id?: string;
  }[];
}

export function usePassagesClasse() {
  const { ecoleId } = useEcoleId();
  const [passages, setPassages] = useState<PassageClasse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPassages = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("passages_classe" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("execute_le", { ascending: false });
    if (error) toast.error(messageErreurBase(error));
    setPassages((data as any) ?? []);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchPassages(); }, [fetchPassages]);

  const executer = useCallback(
    async (anneeSource: string, anneeCible: string, plan: PlanClasseGroup[]) => {
      if (!ecoleId) return null;
      const { data, error } = await supabase.rpc("executer_passage_classe" as any, {
        _ecole_id: ecoleId,
        _annee_source: anneeSource,
        _annee_cible: anneeCible,
        _plan: plan as any,
      });
      if (error) { toast.error(messageErreurBase(error)); return null; }
      toast.success(
        `Passage effectué : ${(data as any)?.promus ?? 0} promu(s), ${(data as any)?.redoubles ?? 0} redoublant(s), ${(data as any)?.exclus ?? 0} exclu(s), ${(data as any)?.sortants ?? 0} sortant(s).`,
      );
      await fetchPassages();
      return data;
    },
    [ecoleId, fetchPassages],
  );

  const annuler = useCallback(
    async (passageId: string) => {
      const { data, error } = await supabase.rpc("annuler_passage_classe" as any, {
        _passage_id: passageId,
      });
      if (error) { toast.error(messageErreurBase(error)); return false; }
      toast.success(`Passage annulé (${(data as any)?.inscriptions_supprimees ?? 0} inscription(s) supprimée(s))`);
      await fetchPassages();
      return true;
    },
    [fetchPassages],
  );

  const cloturer = useCallback(async (anneeId: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase.rpc("cloturer_annee" as any, {
      _ecole_id: ecoleId, _annee_id: anneeId,
    });
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Année clôturée définitivement (lecture seule)");
    return true;
  }, [ecoleId]);

  const restaurer = useCallback(async (anneeId: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase.rpc("restaurer_annee" as any, {
      _ecole_id: ecoleId, _annee_id: anneeId,
    });
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Année restaurée (verrouillée, modifiable par un admin)");
    return true;
  }, [ecoleId]);

  const activer = useCallback(async (anneeId: string) => {
    if (!ecoleId) return false;
    const { error } = await supabase.rpc("activer_annee_scolaire" as any, {
      _ecole_id: ecoleId, _annee_id: anneeId,
    });
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Année activée");
    return true;
  }, [ecoleId]);

  return { passages, loading, fetchPassages, executer, annuler, cloturer, restaurer, activer };
}
