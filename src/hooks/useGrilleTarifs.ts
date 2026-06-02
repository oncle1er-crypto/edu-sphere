import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";

export type NiveauCode =
  | "MAT1" | "MAT2" | "GS"
  | "CP" | "CE" | "CM"
  | "COL_65" | "COL_4" | "COL_3";

export type Variant = null | "ancien" | "nouveau";

export interface TrancheGrille {
  numero: number;
  label: string;
  mois: number;   // 1-12
  jour: number;   // 1-31
  montant: number;
}

export interface GrilleLigne {
  id: string;
  ecole_id: string;
  annee_id: string;
  niveau_code: NiveauCode;
  variant: Variant;
  libelle: string;
  tranches: TrancheGrille[];
  montant_total: number;
}

export const NIVEAU_LABELS: Record<NiveauCode, string> = {
  MAT1: "Maternelle 1",
  MAT2: "Maternelle 2",
  GS: "Grande Section",
  CP: "CP1-CP2",
  CE: "CE1-CE2",
  CM: "CM1-CM2",
  COL_65: "6ème-5ème",
  COL_4: "4ème",
  COL_3: "3ème",
};

export const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function useGrilleTarifs() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const qc = useQueryClient();
  const key = ["grille_tarifs", ecoleId, anneeId];

  const query = useQuery({
    queryKey: key,
    enabled: !!ecoleId && !!anneeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grille_tarifs_niveaux" as any)
        .select("*")
        .eq("ecole_id", ecoleId!)
        .eq("annee_id", anneeId!)
        .order("niveau_code");
      if (error) throw error;
      return (data ?? []) as unknown as GrilleLigne[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (
      l: Partial<GrilleLigne> & {
        niveau_code: NiveauCode;
        variant: Variant;
        libelle: string;
        tranches: TrancheGrille[];
      },
    ) => {
      const payload: any = {
        ecole_id: ecoleId,
        annee_id: anneeId,
        niveau_code: l.niveau_code,
        variant: l.variant,
        libelle: l.libelle,
        tranches: l.tranches,
      };
      if (l.id) payload.id = l.id;

      const { error } = await supabase
        .from("grille_tarifs_niveaux" as any)
        .upsert(payload as any, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Tarif enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("grille_tarifs_niveaux" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Tarif supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const regenererPreInscrits = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        "regenerer_tranches_pre_inscrits" as any,
        { _ecole_id: ecoleId, _annee_id: anneeId },
      );
      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: (n) => {
      toast.success(`${n} élève(s) pré-inscrit(s) régénéré(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupliquerDepuis = useMutation({
    mutationFn: async (anneeSource: string) => {
      const { data, error } = await supabase.rpc(
        "dupliquer_grille_annee" as any,
        { _ecole_id: ecoleId, _annee_source: anneeSource, _annee_cible: anneeId },
      );
      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(`${n} ligne(s) reconduite(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    lignes: query.data ?? [],
    isLoading: query.isLoading,
    ecoleId, anneeId,
    upsert: upsert.mutate, isSaving: upsert.isPending,
    remove: remove.mutate, isRemoving: remove.isPending,
    regenererPreInscrits: regenererPreInscrits.mutate, isRegenerating: regenererPreInscrits.isPending,
    dupliquerDepuis: dupliquerDepuis.mutate, isDuplicating: dupliquerDepuis.isPending,
  };
}
