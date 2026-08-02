import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type RhParametre = Tables["rh_parametres"]["Row"];
export type RhRubrique = Tables["rh_rubriques"]["Row"];
export type RhTrancheIrpp = Tables["rh_bareme_irpp"]["Row"];
export type RhPalierAnciennete = Tables["rh_bareme_anciennete"]["Row"];

export type RhGroupe = "cnps" | "cmu" | "charges_patronales" | "administratif";
export type RhRubriqueType = "gain" | "retenue" | "charge_patronale";

/** Paramétrage RH & paie (barèmes Côte d'Ivoire) de l'école courante. */
export function useRhParametres() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [parametresList, setParametresList] = useState<RhParametre[]>([]);
  const [rubriquesList, setRubriquesList] = useState<RhRubrique[]>([]);
  const [baremeIrpp, setBaremeIrpp] = useState<RhTrancheIrpp[]>([]);
  const [baremeAnciennete, setBaremeAnciennete] = useState<RhPalierAnciennete[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) {
      setParametresList([]);
      setRubriquesList([]);
      setBaremeIrpp([]);
      setBaremeAnciennete([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [p, r, irpp, anc] = await Promise.all([
      supabase.from("rh_parametres").select("*").eq("ecole_id", ecoleId).order("ordre"),
      supabase.from("rh_rubriques").select("*").eq("ecole_id", ecoleId).order("ordre"),
      supabase.from("rh_bareme_irpp").select("*").eq("ecole_id", ecoleId).order("ordre"),
      supabase.from("rh_bareme_anciennete").select("*").eq("ecole_id", ecoleId).order("annees_min"),
    ]);
    const err = p.error ?? r.error ?? irpp.error ?? anc.error;
    if (err) toast.error(`Erreur chargement paramètres RH : ${err.message}`);
    setParametresList(p.data ?? []);
    setRubriquesList(r.data ?? []);
    setBaremeIrpp(irpp.data ?? []);
    setBaremeAnciennete(anc.data ?? []);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading) refresh();
  }, [ecoleLoading, refresh]);

  const parametres = useMemo(() => {
    const groups: Record<string, RhParametre[]> = {};
    for (const p of parametresList) {
      (groups[p.groupe] ??= []).push(p);
    }
    return groups;
  }, [parametresList]);

  const rubriques = useMemo(() => {
    const groups: Record<string, RhRubrique[]> = {};
    for (const r of rubriquesList) {
      (groups[r.type] ??= []).push(r);
    }
    return groups;
  }, [rubriquesList]);

  const updateParametre = async (id: string, valeur: number) => {
    const { error } = await supabase.from("rh_parametres").update({ valeur }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setParametresList((prev) => prev.map((p) => (p.id === id ? { ...p, valeur } : p)));
    toast.success("Paramètre mis à jour");
    return true;
  };

  const updateRubrique = async (id: string, patch: Tables["rh_rubriques"]["Update"]) => {
    const { error } = await supabase.from("rh_rubriques").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setRubriquesList((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as RhRubrique : r)));
    toast.success("Rubrique mise à jour");
    return true;
  };

  const updateTrancheIrpp = async (id: string, patch: Tables["rh_bareme_irpp"]["Update"]) => {
    const { error } = await supabase.from("rh_bareme_irpp").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setBaremeIrpp((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as RhTrancheIrpp : t)));
    toast.success("Tranche IRPP mise à jour");
    return true;
  };

  const updatePalierAnciennete = async (id: string, taux: number) => {
    const { error } = await supabase.from("rh_bareme_anciennete").update({ taux }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setBaremeAnciennete((prev) => prev.map((p) => (p.id === id ? { ...p, taux } : p)));
    toast.success("Palier d'ancienneté mis à jour");
    return true;
  };

  return {
    parametres,
    rubriques,
    baremeIrpp,
    baremeAnciennete,
    loading: loading || ecoleLoading,
    refresh,
    updateParametre,
    updateRubrique,
    updateTrancheIrpp,
    updatePalierAnciennete,
    ecoleId,
  };
}
