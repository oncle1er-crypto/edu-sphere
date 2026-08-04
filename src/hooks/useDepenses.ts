import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface Depense {
  id: string;
  reference: string | null;
  libelle: string;
  categorie: string | null;
  montant: number;
  fournisseur_id: string | null;
  fournisseur_nom?: string;
  /** Niveau imputé — null = dépense commune (répartie entre les niveaux). */
  cycle_id?: string | null;
  date_depense: string;
  statut: string;
  notes: string | null;
  created_at: string;
}

export function useDepenses(range?: { from?: string; to?: string }) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, matchesCycle } = useNiveau();
  const [depensesRaw, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const rangeProvided = range !== undefined;
  const from = range?.from;
  const to = range?.to;

  /**
   * Vue niveau : dépenses du niveau + dépenses communes (cycle_id null).
   * La quote-part des communes est calculée dans les rapports comptables.
   */
  const depenses = useMemo(
    () => (isGlobal ? depensesRaw : depensesRaw.filter((d) => matchesCycle(d.cycle_id))),
    [depensesRaw, isGlobal, matchesCycle],
  );

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    if (rangeProvided && (!from || !to)) {
      setDepenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("depenses")
      .select("*, fournisseurs(nom)")
      .eq("ecole_id", ecoleId);
    if (from) q = q.gte("date_depense", from);
    if (to) q = q.lte("date_depense", to);
    const { data, error } = await q.order("date_depense", { ascending: false });
    if (!error && data) {
      setDepenses(data.map((d: any) => ({ ...d, montant: Number(d.montant), fournisseur_nom: d.fournisseurs?.nom })));
    }
    setLoading(false);
  }, [ecoleId, from, to, rangeProvided]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const addDepense = async (d: Omit<Depense, "id" | "created_at" | "fournisseur_nom">) => {
    if (!ecoleId) return;
    const { error } = await supabase.from("depenses").insert({ ...d, ecole_id: ecoleId });
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense enregistrée");
    fetch();
  };

  const updateStatut = async (id: string, statut: string) => {
    const { error } = await supabase.from("depenses").update({ statut }).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Statut mis à jour");
    fetch();
  };

  return { depenses, loading: loading || ecoleLoading, addDepense, updateStatut, refetch: fetch, ecoleId };
}
