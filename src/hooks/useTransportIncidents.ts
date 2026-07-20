import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export interface IncidentRow {
  id: string;
  ecole_id: string;
  vehicule_id: string | null;
  chauffeur_id: string | null;
  date_incident: string;
  type: string;
  gravite: string;
  description: string;
  statut: string;
  vehicules?: { immatriculation: string } | null;
  chauffeurs?: { nom: string; prenom: string } | null;
}

export function useTransportIncidents() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [items, setItems] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("transport_incidents" as any)
      .select("*, vehicules(immatriculation), chauffeurs(nom, prenom)")
      .eq("ecole_id", ecoleId)
      .order("date_incident", { ascending: false });
    if (error) { console.error(error); toast.error("Erreur chargement incidents"); }
    else setItems((data ?? []) as any);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading) refresh(); }, [ecoleLoading, refresh]);

  const add = async (payload: Partial<IncidentRow>) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("transport_incidents" as any).insert({ ...payload, ecole_id: ecoleId } as any);
    if (error) { toast.error(error.message); return false; }
    toast.success("Incident enregistré");
    await refresh();
    return true;
  };

  const update = async (id: string, patch: Partial<IncidentRow>) => {
    const { error } = await supabase.from("transport_incidents" as any).update(patch as any).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Mis à jour");
    await refresh();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("transport_incidents" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Supprimé");
    await refresh();
    return true;
  };

  return { items, loading, refresh, add, update, remove };
}
