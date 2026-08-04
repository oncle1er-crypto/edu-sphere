import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type ConseilUpdate = Database["public"]["Tables"]["conseils_classe"]["Update"];
type SessionUpdate = Database["public"]["Tables"]["sessions_compositions"]["Update"];

export type ConseilRow = {
  id: string;
  ecole_id: string;
  annee_id: string | null;
  periode_id: string | null;
  classe_id: string;
  date_conseil: string;
  heure_debut: string | null;
  president_id: string | null;
  participants: any;
  ordre_du_jour: string | null;
  proces_verbal: string | null;
  statut: string;
  classe_nom?: string;
  president_nom?: string;
};

export function useConseilsClasse() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [items, setItems] = useState<ConseilRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    let q = supabase
      .from("conseils_classe")
      .select("*, classes(nom)")
      .eq("ecole_id", ecoleId)
      .order("date_conseil", { ascending: false });
    if (anneeId) q = q.eq("annee_id", anneeId);
    const { data, error } = await q;
    if (error) {
      toast.error("Erreur chargement conseils");
      setLoading(false);
      return;
    }
    // Résolution des présidents en une requête séparée (pas de FK entre conseils_classe.president_id et enseignants).
    const presidentIds = Array.from(
      new Set((data ?? []).map((r: any) => r.president_id).filter(Boolean))
    );
    const nameMap = new Map<string, string>();
    if (presidentIds.length > 0) {
      const { data: ens } = await supabase
        .from("enseignants")
        .select("id, nom, prenom")
        .in("id", presidentIds as string[]);
      (ens ?? []).forEach((e: any) => nameMap.set(e.id, `${e.nom} ${e.prenom}`));
    }
    setItems(
      (data ?? []).map((r: any) => ({
        ...r,
        classe_nom: r.classes?.nom ?? "—",
        president_nom: r.president_id ? nameMap.get(r.president_id) ?? "" : "",
      }))
    );
    setLoading(false);
  }, [ecoleId, anneeId]);


  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = async (input: {
    classe_id: string;
    date_conseil: string;
    heure_debut?: string | null;
    president_id?: string | null;
    ordre_du_jour?: string | null;
    periode_id?: string | null;
  }) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("conseils_classe").insert({
      ecole_id: ecoleId,
      annee_id: anneeId,
      statut: "planifie",
      ...input,
    });
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Conseil planifié");
    await fetchAll();
    return true;
  };

  const update = async (id: string, patch: ConseilUpdate) => {
    const { error } = await supabase.from("conseils_classe").update(patch).eq("id", id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Conseil mis à jour");
    await fetchAll();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("conseils_classe").delete().eq("id", id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Conseil supprimé");
    await fetchAll();
    return true;
  };

  return { items, loading, create, update, remove, refresh: fetchAll };
}

export type SessionCompoRow = {
  id: string;
  ecole_id: string;
  annee_id: string | null;
  periode_id: string | null;
  libelle: string;
  type_session: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  consignes: string | null;
};

export function useSessionsCompositions() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [items, setItems] = useState<SessionCompoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    let q = supabase
      .from("sessions_compositions")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_debut", { ascending: false });
    if (anneeId) q = q.eq("annee_id", anneeId);
    const { data, error } = await q;
    if (error) toast.error("Erreur chargement compositions");
    else setItems(data ?? []);
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = async (input: {
    libelle: string;
    type_session: string;
    date_debut: string;
    date_fin: string;
    consignes?: string | null;
    periode_id?: string | null;
  }) => {
    if (!ecoleId) return false;
    const { error } = await supabase.from("sessions_compositions").insert({
      ecole_id: ecoleId,
      annee_id: anneeId,
      statut: "planifiee",
      ...input,
    });
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Session créée");
    await fetchAll();
    return true;
  };

  const update = async (id: string, patch: SessionUpdate) => {
    const { error } = await supabase.from("sessions_compositions").update(patch).eq("id", id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Session mise à jour");
    await fetchAll();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("sessions_compositions").delete().eq("id", id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Session supprimée");
    await fetchAll();
    return true;
  };

  return { items, loading, create, update, remove, refresh: fetchAll };
}
