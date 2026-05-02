import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface Fournisseur {
  id: string;
  nom: string;
  categorie: string | null;
  contact: string | null;
  email: string | null;
  solde_du: number;
  statut: string;
}

export function useFournisseurs() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase.from("fournisseurs").select("*").eq("ecole_id", ecoleId).order("nom");
    if (data) setFournisseurs(data.map((f: any) => ({ ...f, solde_du: Number(f.solde_du) })));
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const addFournisseur = async (f: Pick<Fournisseur, "nom" | "categorie" | "contact" | "email">) => {
    if (!ecoleId) return;
    const { error } = await supabase.from("fournisseurs").insert({ ...f, ecole_id: ecoleId });
    if (error) { toast.error(error.message); return; }
    toast.success("Fournisseur ajouté");
    fetch();
  };

  return { fournisseurs, loading: loading || ecoleLoading, addFournisseur, refetch: fetch, ecoleId };
}
