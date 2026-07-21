import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export type SpGenre = "F" | "G";

export interface SpStockTenue {
  id: string;
  ecole_id: string;
  classe_id: string;
  genre: SpGenre;
  stock_actuel: number;
  seuil_alerte: number;
  prix_unitaire: number | null;
  created_at: string;
  updated_at: string;
}

export function useSpStockTenues() {
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<SpStockTenue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sp_stock_tenues")
      .select("*")
      .eq("ecole_id", ecoleId);
    if (error) toast.error(error.message);
    setRows((data ?? []) as SpStockTenue[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ecoleId) return;
    const ch = supabase.channel(`sp_stock_tenues:${ecoleId}:${Math.random().toString(36).slice(2)}`);
    ch.on("postgres_changes" as any, { event: "*", schema: "public", table: "sp_stock_tenues", filter: `ecole_id=eq.${ecoleId}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ecoleId, load]);

  const upsert = async (patch: Partial<SpStockTenue> & { classe_id: string; genre: SpGenre }) => {
    if (!ecoleId) return null;
    const payload: any = {
      ecole_id: ecoleId,
      classe_id: patch.classe_id,
      genre: patch.genre,
      stock_actuel: patch.stock_actuel ?? 0,
      seuil_alerte: patch.seuil_alerte ?? 5,
      prix_unitaire: patch.prix_unitaire ?? null,
    };
    const { error } = await (supabase as any)
      .from("sp_stock_tenues")
      .upsert(payload, { onConflict: "ecole_id,classe_id,genre" });
    if (error) { toast.error(error.message); return null; }
    toast.success("Stock mis à jour");
    await load();
    return payload;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("sp_stock_tenues").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const findFor = (classe_id: string, genre: SpGenre) =>
    rows.find((r) => r.classe_id === classe_id && r.genre === genre) ?? null;

  return { rows, loading, reload: load, upsert, remove, findFor };
}
