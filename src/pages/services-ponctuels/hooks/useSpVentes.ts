import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export type SpModePaiement =
  | "especes" | "wave" | "orange_money" | "mtn_money" | "moov_money" | "virement" | "cheque";

export type SpVenteStatut = "paye" | "remis" | "attente" | "annule";

export interface SpVenteTenue {
  id: string;
  ecole_id: string;
  numero: string;
  acheteur_type: "eleve" | "candidat" | "libre";
  eleve_id: string | null;
  candidat_id: string | null;
  acheteur_libre: string | null;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  mode_paiement: SpModePaiement;
  statut: SpVenteStatut;
  observations: string | null;
  created_at: string;
  annule_le: string | null;
}

export function useSpVentes() {
  const { ecoleId } = useEcoleId();
  const [ventes, setVentes] = useState<SpVenteTenue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sp_ventes_tenues")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setVentes((data ?? []) as SpVenteTenue[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<SpVenteTenue> & { id?: string }) => {
    if (!ecoleId) return;
    const payload: any = { ...patch, ecole_id: ecoleId };
    if (payload.quantite && payload.prix_unitaire) {
      payload.montant_total = Number(payload.quantite) * Number(payload.prix_unitaire);
    }
    const { data, error } = patch.id
      ? await (supabase as any).from("sp_ventes_tenues").update(payload).eq("id", patch.id).select().single()
      : await (supabase as any).from("sp_ventes_tenues").insert(payload).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Vente enregistrée");
    await load();
    return data as SpVenteTenue;
  };

  const annuler = async (id: string, motif: string) => {
    const { error } = await (supabase as any).from("sp_ventes_tenues")
      .update({ statut: "annule", annule_le: new Date().toISOString(), motif_annulation: motif })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Vente annulée");
    await load();
  };

  return { ventes, loading, reload: load, save, annuler };
}
