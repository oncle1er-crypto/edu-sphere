import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

export interface LigneBudget {
  id: string;
  libelle: string;
  type: string;
  montant_prevu: number;
  montant_realise: number;
}

export function useBudget() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { anneeId, loading: anneeLoading } = useAnneeId();
  const [lignes, setLignes] = useState<LigneBudget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId || !anneeId) return;
    setLoading(true);
    const { data } = await supabase.from("lignes_budget").select("*").eq("ecole_id", ecoleId).eq("annee_id", anneeId).order("type").order("libelle");
    if (data) setLignes(data.map((l: any) => ({ ...l, montant_prevu: Number(l.montant_prevu), montant_realise: Number(l.montant_realise) })));
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => { if (!ecoleLoading && !anneeLoading && ecoleId && anneeId) fetch(); if (!ecoleLoading && !anneeLoading && (!ecoleId || !anneeId)) setLoading(false); }, [ecoleLoading, anneeLoading, ecoleId, anneeId, fetch]);

  const addLigne = async (l: Pick<LigneBudget, "libelle" | "type" | "montant_prevu">) => {
    if (!ecoleId || !anneeId) return;
    const { error } = await supabase.from("lignes_budget").insert({ ...l, ecole_id: ecoleId, annee_id: anneeId });
    if (error) { toast.error(error.message); return; }
    toast.success("Ligne budgétaire ajoutée");
    fetch();
  };

  const updateLigne = async (id: string, updates: Partial<Pick<LigneBudget, "montant_prevu" | "montant_realise">>) => {
    const { error } = await supabase.from("lignes_budget").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetch();
  };

  return { lignes, loading: loading || ecoleLoading || anneeLoading, addLigne, updateLigne, refetch: fetch, ecoleId };
}
