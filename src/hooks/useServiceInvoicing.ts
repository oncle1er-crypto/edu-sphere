import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export type ServiceType = "cantine" | "transport";

export function useServiceInvoicing(serviceType: ServiceType) {
  const { ecoleId } = useEcoleId();
  const qc = useQueryClient();

  const generateFor = useMutation({
    mutationFn: async (abonnementId: string) => {
      const { data, error } = await supabase.rpc("generer_factures_service" as any, {
        _ecole_id: ecoleId,
        _abonnement_id: abonnementId,
        _service_type: serviceType,
      });
      if (error) throw error;
      return (data as unknown as number) ?? 0;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      toast.success(n > 0 ? `${n} facture(s) générée(s)` : "Aucune nouvelle facture (déjà à jour)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateBulk = useMutation({
    mutationFn: async (abonnementIds: string[]) => {
      let total = 0;
      for (const id of abonnementIds) {
        const { data, error } = await supabase.rpc("generer_factures_service" as any, {
          _ecole_id: ecoleId,
          _abonnement_id: id,
          _service_type: serviceType,
        });
        if (error) throw error;
        total += (data as unknown as number) ?? 0;
      }
      return total;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      toast.success(`${n} facture(s) générée(s) au total`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    generateFor: generateFor.mutate,
    isGenerating: generateFor.isPending,
    generateBulk: generateBulk.mutate,
    isBulkGenerating: generateBulk.isPending,
  };
}
