import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface MaintenanceRow {
  id: string;
  ecole_id: string;
  vehicule_id: string;
  type: string;
  date_operation: string;
  km_compteur: number | null;
  cout: number;
  garage: string | null;
  description: string | null;
  prochaine_echeance_date: string | null;
  prochaine_echeance_km: number | null;
  statut: string;
  vehicules?: { immatriculation: string } | null;
}

export function useTransportMaintenance() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [items, setItems] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("transport_maintenance" as any)
      .select("*, vehicules(immatriculation)")
      .eq("ecole_id", ecoleId)
      .order("date_operation", { ascending: false });
    if (error) { console.error(error); toast.error("Erreur chargement maintenance"); }
    else setItems(((data ?? []) as any[]).map((r) => ({ ...r, cout: Number(r.cout) })));
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading) refresh(); }, [ecoleLoading, refresh]);

  const add = async (payload: Partial<MaintenanceRow>) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("transport_maintenance" as any).insert({ ...payload, ecole_id: ecoleId } as any);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Opération enregistrée");
    await refresh();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("transport_maintenance" as any).delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Supprimé");
    await refresh();
    return true;
  };

  return { items, loading, refresh, add, remove };
}
