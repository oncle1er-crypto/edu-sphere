import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface FinanceSettingsData {
  devise: string;
  position_symbole: string;
  taux_tva: number;
  banque: string;
  rib: string;
  numero_momo: string;
  numero_om: string;
  prefixe_facture: string;
  prochain_numero_facture: number;
  prefixe_recu: string;
  modes_paiement: string[];
  rappel_auto: boolean;
  penalite_retard: number;
  frais_inscription: number;
  frais_uniformes: number;
  frais_activites: number;
}


const DEFAULTS: FinanceSettingsData = {
  devise: "XAF",
  position_symbole: "after",
  taux_tva: 0,
  banque: "",
  rib: "",
  numero_momo: "",
  numero_om: "",
  prefixe_facture: "FAC-2025-",
  prochain_numero_facture: 1,
  prefixe_recu: "REC-2025-",
  modes_paiement: ["cash", "momo", "om", "bank"],
  rappel_auto: true,
  penalite_retard: 5,
  frais_inscription: 25000,
  frais_uniformes: 15000,
  frais_activites: 15000,
};


export function useFinanceSettings() {
  const { ecoleId } = useEcoleId();
  const qc = useQueryClient();
  const key = ["finance_settings", ecoleId];

  const query = useQuery({
    queryKey: key,
    enabled: !!ecoleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_settings")
        .select("*")
        .eq("ecole_id", ecoleId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...DEFAULTS };
      return data as unknown as FinanceSettingsData & { id: string; ecole_id: string };
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Partial<FinanceSettingsData>) => {
      const payload: Record<string, unknown> = { ecole_id: ecoleId!, ...values };
      const { error } = await supabase
        .from("finance_settings")
        .upsert(payload as any, { onConflict: "ecole_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Paramètres financiers enregistrés");
    },
    onError: (e: Error) => {
      toast.error("Erreur : " + messageErreurBase(e));
    },
  });

  return { settings: query.data ?? DEFAULTS, isLoading: query.isLoading, save: mutation.mutate, isSaving: mutation.isPending };
}
