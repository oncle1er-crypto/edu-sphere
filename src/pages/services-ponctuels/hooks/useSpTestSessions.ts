import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface SpTestSession {
  id: string;
  ecole_id: string;
  date_test: string;
  libelle: string | null;
  capacite: number | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
}

export function useSpTestSessions() {
  const { ecoleId } = useEcoleId();
  const [sessions, setSessions] = useState<SpTestSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sp_test_sessions")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_test", { ascending: true });
    if (error) toast.error(error.message);
    setSessions((data ?? []) as SpTestSession[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ecoleId) return;
    const ch = supabase.channel(`sp_test_sessions:${ecoleId}:${Math.random().toString(36).slice(2)}`);
    ch.on("postgres_changes" as any, { event: "*", schema: "public", table: "sp_test_sessions", filter: `ecole_id=eq.${ecoleId}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ecoleId, load]);

  const save = async (patch: Partial<SpTestSession> & { id?: string }) => {
    if (!ecoleId) return;
    const payload = { ...patch, ecole_id: ecoleId };
    const { error } = patch.id
      ? await (supabase as any).from("sp_test_sessions").update(payload).eq("id", patch.id)
      : await (supabase as any).from("sp_test_sessions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Session enregistrée");
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("sp_test_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Session supprimée");
    await load();
  };

  return { sessions, loading, reload: load, save, remove };
}
