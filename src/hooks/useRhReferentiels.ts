import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Tables = Database["public"]["Tables"];
export type RhDepartement = Tables["rh_departements"]["Row"];
export type RhCritereEvaluation = Tables["rh_criteres_evaluation"]["Row"];
export type RhParametreRow = Tables["rh_parametres"]["Row"];

/** Référentiels RH paramétrables : départements, critères d'évaluation, paramètres administratifs. */
export function useRhReferentiels() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [departements, setDepartements] = useState<RhDepartement[]>([]);
  const [criteres, setCriteres] = useState<RhCritereEvaluation[]>([]);
  const [parametres, setParametres] = useState<RhParametreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) {
      setDepartements([]);
      setCriteres([]);
      setParametres([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [dep, crit, par] = await Promise.all([
      supabase.from("rh_departements").select("*").eq("ecole_id", ecoleId).eq("active", true).order("ordre"),
      supabase.from("rh_criteres_evaluation").select("*").eq("ecole_id", ecoleId).eq("active", true).order("ordre"),
      supabase.from("rh_parametres").select("*").eq("ecole_id", ecoleId).order("ordre"),
    ]);
    const err = dep.error ?? crit.error ?? par.error;
    if (err) toast.error(`Erreur chargement référentiels RH : ${messageErreurBase(err)}`);
    setDepartements(dep.data ?? []);
    setCriteres(crit.data ?? []);
    setParametres(par.data ?? []);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading) refresh();
  }, [ecoleLoading, refresh]);

  const byCle = useMemo(() => {
    const map: Record<string, RhParametreRow> = {};
    for (const p of parametres) map[p.cle] = p;
    return map;
  }, [parametres]);

  const getNumber = useCallback(
    (cle: string, fallback: number) => {
      const v = byCle[cle]?.valeur;
      return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
    },
    [byCle],
  );

  const getTexte = useCallback(
    (cle: string, fallback: string) => byCle[cle]?.valeur_texte ?? fallback,
    [byCle],
  );

  const updateParametreValeur = async (cle: string, valeur: number) => {
    const row = byCle[cle];
    if (!row) {
      toast.error(`Paramètre « ${cle} » introuvable`);
      return false;
    }
    const { error } = await supabase.from("rh_parametres").update({ valeur }).eq("id", row.id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    setParametres((prev) => prev.map((p) => (p.id === row.id ? { ...p, valeur } : p)));
    return true;
  };

  const updateParametreTexte = async (cle: string, valeur_texte: string) => {
    const row = byCle[cle];
    if (!row) {
      toast.error(`Paramètre « ${cle} » introuvable`);
      return false;
    }
    const { error } = await supabase.from("rh_parametres").update({ valeur_texte }).eq("id", row.id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    setParametres((prev) => prev.map((p) => (p.id === row.id ? { ...p, valeur_texte } : p)));
    return true;
  };

  /** Seuils de mention d'évaluation (groupe `evaluation`). */
  const seuilsEvaluation = useMemo(
    () => ({
      tresBien: getNumber("eval_seuil_tres_bien", 16),
      bien: getNumber("eval_seuil_bien", 14),
      assezBien: getNumber("eval_seuil_assez_bien", 12),
      passable: getNumber("eval_seuil_passable", 10),
    }),
    [getNumber],
  );

  return {
    departements,
    criteres,
    parametres,
    seuilsEvaluation,
    getNumber,
    getTexte,
    updateParametreValeur,
    updateParametreTexte,
    loading: loading || ecoleLoading,
    refresh,
    ecoleId,
  };
}
