import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";

export type ServiceType = "cantine" | "transport";
export type Periodicite = "mensuel" | "trimestriel";

export interface TrancheService {
  numero: number;
  label: string;
  mois: number;
  jour: number;
  montant: number;
}

export interface GrilleService {
  id: string;
  ecole_id: string;
  annee_id: string;
  service_type: ServiceType;
  libelle: string;
  periodicite: Periodicite;
  tranches: TrancheService[];
  montant_total: number;
  actif: boolean;
}

export function useGrilleServices(serviceType: ServiceType) {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const qc = useQueryClient();
  const key = ["grille_services", serviceType, ecoleId, anneeId];

  const query = useQuery({
    queryKey: key,
    enabled: !!ecoleId && !!anneeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grille_tarifs_services" as any)
        .select("*")
        .eq("ecole_id", ecoleId!)
        .eq("annee_id", anneeId!)
        .eq("service_type", serviceType)
        .order("libelle");
      if (error) throw error;
      return (data ?? []) as unknown as GrilleService[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (l: Partial<GrilleService> & {
      libelle: string;
      periodicite: Periodicite;
      tranches: TrancheService[];
    }) => {
      const payload: any = {
        ecole_id: ecoleId,
        annee_id: anneeId,
        service_type: serviceType,
        libelle: l.libelle,
        periodicite: l.periodicite,
        tranches: l.tranches,
        actif: l.actif ?? true,
      };
      if (l.id) payload.id = l.id;
      const { error } = await supabase.from("grille_tarifs_services" as any).upsert(payload as any, { onConflict: "id" });
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
      const { error } = await supabase.from("grille_tarifs_services" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Tarif supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    lignes: query.data ?? [],
    isLoading: query.isLoading,
    anneeId,
    upsert: upsert.mutate,
    isSaving: upsert.isPending,
    remove: remove.mutate,
  };
}
