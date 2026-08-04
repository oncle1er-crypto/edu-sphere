import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface BilletSortie {
  id: string;
  ecole_id: string;
  numero: string;
  sujet_type: "eleve" | "enseignant" | "personnel";
  eleve_id: string | null;
  enseignant_id: string | null;
  motif: string;
  date_sortie: string;
  heure_sortie: string;
  heure_retour_prevue: string | null;
  heure_retour_effective: string | null;
  accompagnateur: string | null;
  destination: string | null;
  observations: string | null;
  delivre_par: string | null;
  statut: "emis" | "retourne" | "annule";
  created_at: string;
}

export interface CertificatAbsence {
  id: string;
  ecole_id: string;
  numero: string;
  sujet_type: "eleve" | "enseignant" | "personnel";
  eleve_id: string | null;
  enseignant_id: string | null;
  date_debut: string;
  date_fin: string;
  motif: string;
  justifie: boolean;
  type_justificatif: string | null;
  piece_jointe_url: string | null;
  observations: string | null;
  delivre_par: string | null;
  created_at: string;
}

export function useBilletsSortie() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [items, setItems] = useState<BilletSortie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("billets_sortie")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_sortie", { ascending: false })
      .order("heure_sortie", { ascending: false });
    if (error) toast.error(messageErreurBase(error));
    setItems((data ?? []) as BilletSortie[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (payload: Partial<BilletSortie>) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("billets_sortie").insert({
      ecole_id: ecoleId,
      delivre_par: user?.id ?? null,
      ...payload,
    } as any).select().single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success(`Billet ${data.numero} émis`);
    await fetchAll();
    return data as BilletSortie;
  };

  const markReturned = async (id: string, heure: string) => {
    const { error } = await supabase.from("billets_sortie")
      .update({ heure_retour_effective: heure, statut: "retourne" })
      .eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Retour enregistré");
    await fetchAll();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("billets_sortie")
      .update({ statut: "annule" }).eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Billet annulé");
    await fetchAll();
  };

  return { items, loading, fetchAll, create, markReturned, cancel };
}

export function useCertificatsAbsence() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [items, setItems] = useState<CertificatAbsence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("certificats_absence")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_debut", { ascending: false });
    if (error) toast.error(messageErreurBase(error));
    setItems((data ?? []) as CertificatAbsence[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (payload: Partial<CertificatAbsence>) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("certificats_absence").insert({
      ecole_id: ecoleId,
      delivre_par: user?.id ?? null,
      ...payload,
    } as any).select().single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success(`Certificat ${data.numero} délivré`);
    await fetchAll();
    return data as CertificatAbsence;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("certificats_absence").delete().eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Certificat supprimé");
    await fetchAll();
  };

  return { items, loading, fetchAll, create, remove };
}
