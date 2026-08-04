import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface CompteTresorerie {
  id: string;
  nom: string;
  numero: string | null;
  type: string;
  solde: number;
  statut: string;
}

export interface MouvementTresorerie {
  id: string;
  compte_id: string;
  compte_nom?: string;
  libelle: string;
  montant: number;
  type: string;
  date_mouvement: string;
  reference: string | null;
}

export function useTresorerie() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [comptes, setComptes] = useState<CompteTresorerie[]>([]);
  const [mouvements, setMouvements] = useState<MouvementTresorerie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const [cRes, mRes] = await Promise.all([
      supabase.from("comptes_tresorerie").select("*").eq("ecole_id", ecoleId).order("nom"),
      supabase.from("mouvements_tresorerie").select("*, comptes_tresorerie(nom)").eq("ecole_id", ecoleId).order("date_mouvement", { ascending: false }).limit(50),
    ]);
    if (cRes.data) setComptes(cRes.data.map((c: any) => ({ ...c, solde: Number(c.solde) })));
    if (mRes.data) setMouvements(mRes.data.map((m: any) => ({ ...m, montant: Number(m.montant), compte_nom: m.comptes_tresorerie?.nom })));
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const addCompte = async (c: Pick<CompteTresorerie, "nom" | "numero" | "type" | "solde">) => {
    if (!ecoleId) return;
    const { error } = await supabase.from("comptes_tresorerie").insert({ ...c, ecole_id: ecoleId });
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Compte ajouté");
    fetch();
  };

  const addMouvement = async (m: Pick<MouvementTresorerie, "compte_id" | "libelle" | "montant" | "type" | "date_mouvement">) => {
    if (!ecoleId) return;
    const { error } = await supabase.from("mouvements_tresorerie").insert({ ...m, ecole_id: ecoleId });
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Mouvement enregistré");
    fetch();
  };

  return { comptes, mouvements, loading: loading || ecoleLoading, addCompte, addMouvement, refetch: fetch, ecoleId };
}
