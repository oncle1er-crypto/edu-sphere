import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

export type SpCandidatStatut =
  | "en_attente" | "programme" | "absent" | "present" | "admis" | "refuse";

export interface SpCandidat {
  id: string;
  ecole_id: string;
  numero: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  date_naissance: string | null;
  classe_demandee: string | null;
  ecole_origine: string | null;
  parent: string | null;
  telephone: string | null;
  date_test: string | null;
  statut: SpCandidatStatut;
  converti_eleve_id: string | null;
  observations: string | null;
  created_at: string;
}

export function useSpCandidats() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [candidats, setCandidats] = useState<SpCandidat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sp_candidats")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCandidats((data ?? []) as SpCandidat[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ecoleId) return;
    const channel = supabase
      .channel(`sp_candidats:${ecoleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sp_candidats", filter: `ecole_id=eq.${ecoleId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ecoleId, load]);

  const save = async (patch: Partial<SpCandidat> & { id?: string }) => {
    if (!ecoleId) return;
    const payload = { ...patch, ecole_id: ecoleId };
    const { error } = patch.id
      ? await (supabase as any).from("sp_candidats").update(payload).eq("id", patch.id)
      : await (supabase as any).from("sp_candidats").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Candidat enregistré");
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("sp_candidats").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Candidat supprimé");
    await load();
  };

  const convertir = async (candidatId: string, classeId?: string | null) => {
    if (!anneeId) { toast.error("Aucune année active"); return null; }
    const { data, error } = await (supabase as any).rpc("sp_convertir_candidat", {
      _candidat_id: candidatId, _annee_id: anneeId, _classe_id: classeId ?? null,
    });
    if (error) { toast.error(error.message); return null; }
    toast.success("Candidat converti en élève");
    await load();
    return data as string;
  };

  return { candidats, loading, reload: load, save, remove, convertir };
}
