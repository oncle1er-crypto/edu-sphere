import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export type ContratType = "CDD" | "CDI" | "vacation" | "stage";
export type ContratStatut = "brouillon" | "actif" | "suspendu" | "rompu" | "termine";

export interface ContratEnseignant {
  id: string;
  ecole_id: string;
  enseignant_id: string;
  parent_contrat_id: string | null;
  type: ContratType;
  statut: ContratStatut;
  date_debut: string;
  date_fin: string | null;
  periode_essai_fin: string | null;
  preavis_jours: number | null;
  quotite: number;
  salaire_base: number;
  primes: any;
  motif_rupture: string | null;
  date_rupture: string | null;
  signe_le: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ContratInsert = Omit<
  ContratEnseignant,
  "id" | "ecole_id" | "created_at" | "updated_at"
> & { ecole_id?: string };

export function useContratsEnseignants() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [contrats, setContrats] = useState<ContratEnseignant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contrats_enseignants")
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_debut", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erreur chargement contrats");
    } else {
      setContrats((data ?? []) as ContratEnseignant[]);
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetch();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetch]);

  const add = async (c: ContratInsert) => {
    if (!ecoleId) return null;
    const { data, error } = await (supabase as any)
      .from("contrats_enseignants")
      .insert({ ...c, ecole_id: ecoleId })
      .select()
      .single();
    if (error) {
      toast.error(messageErreurBase(error));
      return null;
    }
    toast.success("Contrat créé");
    await fetch();
    return data as ContratEnseignant;
  };

  const update = async (id: string, updates: Partial<ContratEnseignant>) => {
    const { error } = await (supabase as any)
      .from("contrats_enseignants")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Contrat mis à jour");
    await fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any)
      .from("contrats_enseignants")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Contrat supprimé");
    await fetch();
    return true;
  };

  const resilier = async (id: string, motif: string, dateRupture: string) => {
    const { error } = await (supabase as any).rpc("resilier_contrat_enseignant", {
      _contrat_id: id,
      _motif: motif,
      _date_rupture: dateRupture,
    });
    if (error) {
      toast.error(messageErreurBase(error));
      return false;
    }
    toast.success("Contrat résilié");
    await fetch();
    return true;
  };

  const renouveler = async (source: ContratEnseignant, newFields: Partial<ContratInsert>) => {
    const payload: ContratInsert = {
      enseignant_id: source.enseignant_id,
      parent_contrat_id: source.id,
      type: source.type,
      statut: "actif",
      date_debut: newFields.date_debut ?? new Date().toISOString().slice(0, 10),
      date_fin: newFields.date_fin ?? null,
      periode_essai_fin: null,
      preavis_jours: source.preavis_jours,
      quotite: source.quotite,
      salaire_base: newFields.salaire_base ?? source.salaire_base,
      primes: source.primes ?? [],
      motif_rupture: null,
      date_rupture: null,
      signe_le: null,
      notes: newFields.notes ?? `Renouvellement du contrat ${source.id.slice(0, 8)}`,
    };
    // Marque l'ancien contrat comme terminé
    await update(source.id, { statut: "termine" });
    return add(payload);
  };

  return { contrats, loading: loading || ecoleLoading, refetch: fetch, add, update, remove, resilier, renouveler, ecoleId };
}
