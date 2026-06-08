import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

function useEntity<T = any>(table: string, orderBy: string = "created_at", ascending = false) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from(table as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order(orderBy, { ascending });
    if (error) {
      console.error(error);
      toast.error(`Erreur chargement ${table}`);
    } else {
      setItems((data ?? []) as T[]);
    }
    setLoading(false);
  }, [ecoleId, table, orderBy, ascending]);

  useEffect(() => { if (!ecoleLoading) refresh(); }, [ecoleLoading, refresh]);

  const add = async (payload: any) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from(table as any).insert({ ...payload, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Ajouté");
    await refresh();
    return data;
  };

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Mis à jour");
    await refresh();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Supprimé");
    await refresh();
    return true;
  };

  return { items, loading, refresh, add, update, remove };
}

export const useCantineRegimes = () => useEntity<any>("cantine_regimes", "created_at", false);
export const useCantineIncidents = () => useEntity<any>("cantine_incidents", "date_incident", false);
export const useCantinePlanning = () => useEntity<any>("cantine_planning", "date_service", false);
export const useCantinePersonnel = () => useEntity<any>("cantine_personnel", "nom", true);
