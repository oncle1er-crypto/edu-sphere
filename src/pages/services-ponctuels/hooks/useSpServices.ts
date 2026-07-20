import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface SpService {
  id: string;
  ecole_id: string;
  slug: string;
  nom: string;
  description: string | null;
  prix: number;
  actif: boolean;
  accepte_partiel: boolean;
  gere_stock: boolean;
  couleur: string;
  icone: string;
  stock_actuel: number | null;
}

export function useSpServices() {
  const { ecoleId } = useEcoleId();
  const [services, setServices] = useState<SpService[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sp_services")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("nom");
    if (error) toast.error(error.message);
    setServices((data ?? []) as SpService[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ecoleId) return;
    const channel = supabase.channel(`sp_services:${ecoleId}:${Math.random().toString(36).slice(2)}`);
    channel
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "sp_services", filter: `ecole_id=eq.${ecoleId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ecoleId, load]);

  const save = async (patch: Partial<SpService> & { id?: string }) => {
    if (!ecoleId) return;
    const payload = { ...patch, ecole_id: ecoleId };
    const { error } = patch.id
      ? await (supabase as any).from("sp_services").update(payload).eq("id", patch.id)
      : await (supabase as any).from("sp_services").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Service enregistré");
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("sp_services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Service supprimé");
    await load();
  };

  return { services, loading, reload: load, save, remove };
}
