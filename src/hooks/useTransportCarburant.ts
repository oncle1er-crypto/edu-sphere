import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface CarburantRow {
  id: string;
  ecole_id: string;
  vehicule_id: string;
  chauffeur_id: string | null;
  date_plein: string;
  litres: number;
  prix_litre: number;
  montant: number;
  km_compteur: number | null;
  notes: string | null;
  vehicules?: { immatriculation: string } | null;
}

export function useTransportCarburant() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [items, setItems] = useState<CarburantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("transport_carburant" as any)
      .select("*, vehicules(immatriculation)")
      .eq("ecole_id", ecoleId)
      .order("date_plein", { ascending: false });
    if (error) { console.error(error); toast.error("Erreur chargement carburant"); }
    else setItems(((data ?? []) as any[]).map((r) => ({ ...r, litres: Number(r.litres), prix_litre: Number(r.prix_litre), montant: Number(r.montant) })));
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading) refresh(); }, [ecoleLoading, refresh]);

  const add = async (payload: Partial<CarburantRow>) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("transport_carburant" as any).insert({ ...payload, ecole_id: ecoleId } as any);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Plein enregistré");
    await refresh();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("transport_carburant" as any).delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Supprimé");
    await refresh();
    return true;
  };

  return { items, loading, refresh, add, remove };
}
