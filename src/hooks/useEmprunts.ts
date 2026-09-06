import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { useNiveauFilters } from "./useNiveauFilters";

type EmpruntRow = Database["public"]["Tables"]["emprunts"]["Row"];

export interface Emprunt extends EmpruntRow {
  livre_titre?: string;
  eleve_nom?: string;
  enseignant_nom?: string;
}

export function useEmprunts() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [loading, setLoading] = useState(true);
  const { isGlobal, keepClasse, matchesCycle } = useNiveauFilters();

  const fetchEmprunts = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("emprunts")
      .select("*, livres(titre, cycle_id), eleves(nom, prenom, classe_id), enseignants(nom, prenom, cycle_id)")
      .eq("ecole_id", ecoleId)
      .order("date_emprunt", { ascending: false });

    if (error) { console.error(error); toast.error("Erreur chargement emprunts"); }
    else {
      const visibles = isGlobal ? (data ?? []) : (data ?? []).filter((e: any) => {
        if (e.eleve_id) return keepClasse(e.eleves?.classe_id);
        if (e.enseignant_id) return matchesCycle(e.enseignants?.cycle_id);
        return matchesCycle(e.livres?.cycle_id);
      });
      setEmprunts(visibles.map((e: any) => ({
        ...e,
        livre_titre: e.livres?.titre ?? "",
        eleve_nom: e.eleves ? `${e.eleves.nom} ${e.eleves.prenom}` : "",
        enseignant_nom: e.enseignants ? `${e.enseignants.nom} ${e.enseignants.prenom}` : "",
      })));
    }
    setLoading(false);
  }, [ecoleId, isGlobal, keepClasse, matchesCycle]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchEmprunts();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchEmprunts]);

  const addEmprunt = async (emprunt: Database["public"]["Tables"]["emprunts"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("emprunts").insert({ ...emprunt, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Emprunt enregistré");
    await fetchEmprunts();
    return data;
  };

  const returnEmprunt = async (id: string) => {
    const { error } = await supabase.from("emprunts").update({ statut: "rendu", date_retour_effective: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Retour enregistré");
    await fetchEmprunts();
    return true;
  };

  return { emprunts, loading: loading || ecoleLoading, fetchEmprunts, addEmprunt, returnEmprunt, ecoleId };
}
