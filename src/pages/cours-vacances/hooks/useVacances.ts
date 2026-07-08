import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

export type VacClasse = {
  id: string; ecole_id: string; annee_id: string | null;
  nom: string; montant: number; capacite: number | null; actif: boolean;
};
export type VacEleve = {
  id: string; ecole_id: string; annee_id: string | null; classe_id: string;
  nom: string; prenom: string; sexe: "M" | "F" | null; date_naissance: string | null;
  contact_parent: string | null; etablissement_origine: string | null; observation: string | null;
  date_inscription: string; statut_paiement: "paye" | "non_paye" | "partiel";
};
export type VacPaiement = {
  id: string; ecole_id: string; eleve_id: string; classe_id: string;
  montant_attendu: number; montant_paye: number; date_paiement: string;
  mode: "especes" | "mobile_money" | "virement" | "autre";
  statut: "paye" | "non_paye" | "partiel"; observation: string | null;
};
export type VacEnseignant = {
  id: string; ecole_id: string; annee_id: string | null;
  nom: string; prenom: string; telephone: string | null;
  classe_id: string | null; matiere: string | null;
  honoraire_prevu: number; observation: string | null;
};
export type VacHonoraire = {
  id: string; ecole_id: string; enseignant_id: string;
  montant: number; date_paiement: string;
  mode: "especes" | "mobile_money" | "virement" | "autre"; observation: string | null;
};

export function useVacancesData() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [classes, setClasses] = useState<VacClasse[]>([]);
  const [eleves, setEleves] = useState<VacEleve[]>([]);
  const [paiements, setPaiements] = useState<VacPaiement[]>([]);
  const [enseignants, setEnseignants] = useState<VacEnseignant[]>([]);
  const [honoraires, setHonoraires] = useState<VacHonoraire[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ecoleId) { setLoading(false); return; }
    setLoading(true);
    const [c, e, p, en, h] = await Promise.all([
      supabase.from("vacances_classes" as any).select("*").eq("ecole_id", ecoleId).order("nom"),
      supabase.from("vacances_eleves" as any).select("*").eq("ecole_id", ecoleId).order("nom"),
      supabase.from("vacances_paiements" as any).select("*").eq("ecole_id", ecoleId).order("date_paiement", { ascending: false }),
      supabase.from("vacances_enseignants" as any).select("*").eq("ecole_id", ecoleId).order("nom"),
      supabase.from("vacances_honoraires" as any).select("*").eq("ecole_id", ecoleId).order("date_paiement", { ascending: false }),
    ]);
    setClasses((c.data ?? []) as any);
    setEleves((e.data ?? []) as any);
    setPaiements((p.data ?? []) as any);
    setEnseignants((en.data ?? []) as any);
    setHonoraires((h.data ?? []) as any);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { load(); }, [load]);

  return { ecoleId, anneeId, classes, eleves, paiements, enseignants, honoraires, loading, reload: load,
    save: async (table: string, row: any, id?: string) => {
      if (!ecoleId) { toast.error("École introuvable"); return null; }
      // Certaines tables vacances n'ont pas de colonne annee_id.
      const tablesWithoutAnnee = new Set(["vacances_paiements", "vacances_honoraires"]);
      const payload: any = { ...row, ecole_id: ecoleId };
      if (!tablesWithoutAnnee.has(table)) payload.annee_id = anneeId ?? null;
      const q = id
        ? supabase.from(table as any).update(payload).eq("id", id).select().single()
        : supabase.from(table as any).insert(payload).select().single();
      const { data, error } = await q;
      if (error) {
        console.error(`[vacances.save] ${table} error:`, error, "payload:", payload);
        toast.error(error.message);
        return null;
      }
      toast.success(id ? "Modifié" : "Enregistré");
      await load();
      return data;
    },
    remove: async (table: string, id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) { toast.error(error.message); return false; }
      toast.success("Supprimé");
      await load();
      return true;
    },
  };
}
