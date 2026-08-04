import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

function useEntity<T = any>(table: string, orderBy = "created_at", ascending = false) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ecoleId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from(table as any)
      .select("*, enseignants(nom, prenom)")
      .eq("ecole_id", ecoleId)
      .order(orderBy, { ascending });
    if (error) {
      // fallback without join
      const { data: d2, error: e2 } = await supabase
        .from(table as any).select("*").eq("ecole_id", ecoleId).order(orderBy, { ascending });
      if (e2) { toast.error(`Erreur chargement ${table}`); setItems([]); }
      else setItems((d2 ?? []) as T[]);
    } else {
      setItems((data ?? []) as T[]);
    }
    setLoading(false);
  }, [ecoleId, table, orderBy, ascending]);

  useEffect(() => { if (!ecoleLoading) refresh(); }, [ecoleLoading, refresh]);

  const add = async (payload: any) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from(table as any).insert({ ...payload, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Ajouté");
    await refresh();
    return data;
  };
  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Mis à jour");
    await refresh();
    return true;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Supprimé");
    await refresh();
    return true;
  };
  return { items, loading, refresh, add, update, remove };
}

export const useEnseignantEvaluations = () => useEntity<any>("enseignants_evaluations", "date_evaluation", false);
export const useEnseignantCandidatures = () => useEntity<any>("enseignants_candidatures", "date_candidature", false);
export const useEnseignantFormations = () => useEntity<any>("enseignants_formations", "date_debut", false);
export const useEnseignantDocuments = () => useEntity<any>("enseignants_documents", "created_at", false);
