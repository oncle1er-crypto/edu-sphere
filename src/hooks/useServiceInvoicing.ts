import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export type ServiceType = "cantine" | "transport";

/**
 * Facturation séquentielle des services : chaque appel ouvre au maximum
 * UNE période — la plus ancienne non encore facturée — et seulement si
 * l'échéance est atteinte (ou si `forcer` est vrai : encaissement anticipé).
 * Si la facture précédente n'est pas soldée, la base refuse la génération.
 */
export function useServiceInvoicing(serviceType: ServiceType, onDone?: () => void | Promise<void>) {
  const { ecoleId } = useEcoleId();
  const qc = useQueryClient();

  const callRpc = async (abonnementId: string, forcer = false) => {
    const { data, error } = await supabase.rpc("generer_factures_service" as any, {
      _ecole_id: ecoleId,
      _abonnement_id: abonnementId,
      _service_type: serviceType,
      _forcer: forcer,
    });
    if (error) throw error;
    return (data as unknown as number) ?? 0;
  };

  const generateFor = useMutation({
    mutationFn: async (arg: string | { id: string; forcer?: boolean }) => {
      const id = typeof arg === "string" ? arg : arg.id;
      const forcer = typeof arg === "string" ? false : !!arg.forcer;
      return callRpc(id, forcer);
    },
    onSuccess: async (n, arg) => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      await onDone?.();
      const anticipe = typeof arg !== "string" && !!arg.forcer;
      toast.success(
        n > 0
          ? anticipe
            ? "Période suivante ouverte par anticipation : 1 facture générée"
            : "Période suivante ouverte : 1 facture générée"
          : "Aucune période à ouvrir : l'échéance suivante n'est pas encore atteinte"
      );
    },
    onError: (e: Error) => toast.error(messageErreurBase(e)),
  });

  const generateBulk = useMutation({
    mutationFn: async (abonnementIds: string[]) => {
      let creees = 0, bloques = 0, rien = 0;
      for (const id of abonnementIds) {
        try {
          const n = await callRpc(id);
          if (n > 0) creees += n; else rien += 1;
        } catch (e) {
          const msg = String((e as { message?: string })?.message ?? "");
          if (msg.includes("facture_precedente_non_soldee")) bloques += 1;
          else throw e;
        }
      }
      return { creees, bloques, rien };
    },
    onSuccess: async ({ creees, bloques, rien }) => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      await onDone?.();
      const parts = [`${creees} facture(s) ouverte(s)`];
      if (bloques > 0) parts.push(`${bloques} abonné(s) bloqué(s) — facture précédente non soldée`);
      if (rien > 0) parts.push(`${rien} sans période à ouvrir`);
      if (creees > 0) toast.success(parts.join(" · "));
      else toast.info(parts.join(" · "));
    },
    onError: (e: Error) => toast.error(messageErreurBase(e)),
  });

  return {
    generateFor: generateFor.mutate,
    isGenerating: generateFor.isPending,
    generateBulk: generateBulk.mutate,
    isBulkGenerating: generateBulk.isPending,
  };
}
