import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface Depense {
  id: string;
  reference: string | null;
  libelle: string;
  categorie: string | null;
  montant: number;
  fournisseur_id: string | null;
  fournisseur_nom?: string;
  date_depense: string;
  statut: string;
  notes: string | null;
  created_at: string;
}

export function useDepenses() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("depenses")
      .select("*, fournisseurs(nom)")
      .eq("ecole_id", ecoleId)
      .order("date_depense", { ascending: false });
    if (!error && data) {
      setDepenses(data.map((d: any) => ({ ...d, montant: Number(d.montant), fournisseur_nom: d.fournisseurs?.nom })));
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const addDepense = async (d: Omit<Depense, "id" | "created_at" | "fournisseur_nom">) => {
    if (!ecoleId) return;
    const { error } = await supabase.from("depenses").insert({ ...d, ecole_id: ecoleId });
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Dépense enregistrée");
    fetch();
  };

  const updateStatut = async (id: string, statut: string) => {
    const { error } = await supabase.from("depenses").update({ statut }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    fetch();
  };

  return { depenses, loading: loading || ecoleLoading, addDepense, updateStatut, refetch: fetch, ecoleId };
}
