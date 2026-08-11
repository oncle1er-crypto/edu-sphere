import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import { useAuth } from "@/context/AuthContext";
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
  enregistre_par: string | null;
  valide_par: string | null;
  valide_le: string | null;
  rejete_par: string | null;
  rejete_le: string | null;
  motif_rejet: string | null;
}

/** Génère une référence de pièce comptable, même convention que les autres
 * modules (PAY-/TRP-/CTN-… : préfixe + fragment temporel en base36). */
function genererReference(): string {
  return `DEP-${Date.now().toString(36).toUpperCase()}`;
}

/** Champs saisis par l'utilisateur à la création — le reste (id, audit, statut initial, référence) est géré par le hook. */
export type NouvelleDepense = {
  libelle: string;
  categorie: string | null;
  montant: number;
  fournisseur_id: string | null;
  cycle_id?: string | null;
  date_depense: string;
  notes: string | null;
};

/** Champs modifiables via l'édition — uniquement autorisée tant que la dépense est "en_attente" (cf. updateDepense). */
export type DepenseEditable = Partial<
  Pick<Depense, "libelle" | "categorie" | "montant" | "fournisseur_id" | "cycle_id" | "date_depense" | "notes">
>;

export function useDepenses(range?: { from?: string; to?: string }) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, matchesCycle } = useNiveau();
  const { user } = useAuth();
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

  const addDepense = async (d: NouvelleDepense) => {
    if (!ecoleId) return;
    if (!(d.montant > 0)) { toast.error("Le montant doit être supérieur à zéro."); return; }
    const { error } = await supabase.from("depenses").insert({
      ...d,
      ecole_id: ecoleId,
      reference: genererReference(),
      statut: "en_attente",
      enregistre_par: user?.id ?? null,
    });
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense enregistrée");
    fetch();
  };

  const trouver = (id: string) => depensesRaw.find((d) => d.id === id);

  /** Édition réservée aux dépenses non encore validées/rejetées, pour ne jamais
   * modifier silencieusement un montant déjà reflété dans un bilan/grand livre. */
  const updateDepense = async (id: string, patch: DepenseEditable) => {
    const cible = trouver(id);
    if (!cible) return;
    if (cible.statut !== "en_attente") {
      toast.error("Seules les dépenses en attente peuvent être modifiées. Réouvrez-la d'abord si besoin.");
      return;
    }
    if (patch.montant !== undefined && !(patch.montant > 0)) { toast.error("Le montant doit être supérieur à zéro."); return; }
    const { error } = await supabase.from("depenses").update(patch).eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense modifiée");
    fetch();
  };

  /** Suppression réservée aux dépenses non encore validées/rejetées — une dépense
   * validée peut déjà être reflétée dans un bilan/export ; on la conserve pour l'audit. */
  const deleteDepense = async (id: string) => {
    const cible = trouver(id);
    if (!cible) return;
    if (cible.statut !== "en_attente") {
      toast.error("Seules les dépenses en attente peuvent être supprimées.");
      return;
    }
    const { error } = await supabase.from("depenses").delete().eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense supprimée");
    fetch();
  };

  const validerDepense = async (id: string) => {
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "validee", valide_par: user?.id ?? null, valide_le: new Date().toISOString(), rejete_par: null, rejete_le: null, motif_rejet: null })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense validée");
    fetch();
  };

  /** Valide plusieurs dépenses en attente en une seule opération (sélection multiple dans la liste). */
  const validerPlusieurs = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "validee", valide_par: user?.id ?? null, valide_le: new Date().toISOString(), rejete_par: null, rejete_le: null, motif_rejet: null })
      .in("id", ids);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success(`${ids.length} dépense(s) validée(s)`);
    fetch();
  };

  const rejeterDepense = async (id: string, motif: string) => {
    if (!motif.trim()) { toast.error("Un motif de rejet est requis."); return; }
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "rejetee", rejete_par: user?.id ?? null, rejete_le: new Date().toISOString(), motif_rejet: motif.trim(), valide_par: null, valide_le: null })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense rejetée");
    fetch();
  };

  /** Repasse une dépense validée ou rejetée en "en_attente" (correction), en effaçant les marqueurs d'audit précédents. */
  const reouvrirDepense = async (id: string) => {
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "en_attente", valide_par: null, valide_le: null, rejete_par: null, rejete_le: null, motif_rejet: null })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense réouverte pour correction");
    fetch();
  };

  return {
    depenses,
    loading: loading || ecoleLoading,
    addDepense,
    updateDepense,
    deleteDepense,
    validerDepense,
    validerPlusieurs,
    rejeterDepense,
    reouvrirDepense,
    refetch: fetch,
    ecoleId,
  };
}
