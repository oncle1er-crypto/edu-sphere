import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { SpModePaiement } from "./useSpVentes";

export interface SpPaiement {
  id: string;
  ecole_id: string;
  numero: string;
  service_id: string;
  beneficiaire_type: "eleve" | "candidat" | "libre";
  eleve_id: string | null;
  candidat_id: string | null;
  beneficiaire_libre: string | null;
  montant_du: number;
  montant_paye: number;
  remise: number;
  mode_paiement: SpModePaiement;
  caissier_id: string | null;
  date_paiement: string;
  observations: string | null;
  annule_le: string | null;
  motif_annulation: string | null;
}

export function useSpPaiements() {
  const { ecoleId } = useEcoleId();
  const [paiements, setPaiements] = useState<SpPaiement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sp_paiements")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_paiement", { ascending: false });
    if (error) toast.error(error.message);
    setPaiements((data ?? []) as SpPaiement[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ecoleId) return;
    const channel = supabase.channel(`sp_paiements:${ecoleId}:${Math.random().toString(36).slice(2)}`);
    channel
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "sp_paiements", filter: `ecole_id=eq.${ecoleId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ecoleId, load]);

  const save = async (patch: Partial<SpPaiement> & { id?: string }) => {
    if (!ecoleId) return null;
    const { data: sess } = await supabase.auth.getUser();
    const payload: any = { ...patch, ecole_id: ecoleId, caissier_id: sess.user?.id ?? null };
    const { data, error } = patch.id
      ? await (supabase as any).from("sp_paiements").update(payload).eq("id", patch.id).select().single()
      : await (supabase as any).from("sp_paiements").insert(payload).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Paiement enregistré");
    await load();
    return data as SpPaiement;
  };

  const annuler = async (id: string, motif: string) => {
    const { error } = await (supabase as any).rpc("sp_annuler_paiement", {
      _paiement_id: id, _motif: motif,
    });
    if (error) return toast.error(error.message);
    toast.success("Paiement annulé");
    await load();
  };

  return { paiements, loading, reload: load, save, annuler };
}
