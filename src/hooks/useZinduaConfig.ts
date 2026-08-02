import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type ZinduaConfig = Database["public"]["Tables"]["zindua_config"]["Row"];
type ZinduaConfigUpdate = Database["public"]["Tables"]["zindua_config"]["Update"];

export const ZINDUA_INTERVALLE_MIN = 15;

/**
 * Normalise un numéro ivoirien au format E.164.
 * Ne complète JAMAIS un chiffre manquant : retourne null si le format est inconnu.
 */
export function normalizePhoneCI(input: string): string | null {
  const cleaned = String(input ?? "").replace(/[\s.\-()]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+225")) {
    const rest = cleaned.slice(4);
    return /^\d{10}$/.test(rest) ? `+225${rest}` : null;
  }
  if (cleaned.startsWith("00225")) {
    const rest = cleaned.slice(5);
    return /^\d{10}$/.test(rest) ? `+225${rest}` : null;
  }
  if (/^\d{10}$/.test(cleaned) && /^(01|05|07|27)/.test(cleaned)) {
    return `+225${cleaned}`;
  }
  return null;
}

export function useZinduaConfig() {
  const { ecoleId } = useEcoleId();
  const [config, setConfig] = useState<ZinduaConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("zindua_config")
      .select("*")
      .eq("ecole_id", ecoleId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching zindua_config:", error);
    }
    setConfig(data ?? null);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = async (patch: ZinduaConfigUpdate) => {
    if (!ecoleId || !config?.id) return;
    if (
      patch.intervalle_min_secondes !== undefined &&
      patch.intervalle_min_secondes !== null &&
      patch.intervalle_min_secondes < ZINDUA_INTERVALLE_MIN
    ) {
      toast.error(`La cadence minimale est de ${ZINDUA_INTERVALLE_MIN} secondes`);
      return;
    }

    const { error } = await supabase
      .from("zindua_config")
      .update(patch)
      .eq("id", config.id);
    if (error) {
      console.error("Error updating zindua_config:", error);
      toast.error("Erreur de sauvegarde");
      return;
    }
    toast.success("Configuration enregistrée");
    await fetchConfig();
  };

  const addTestDestinataire = async (numero: string) => {
    if (!config) return;
    const e164 = normalizePhoneCI(numero);
    if (!e164) {
      toast.error("Numéro ivoirien invalide : 10 chiffres attendus après +225");
      return;
    }
    const current = config.test_destinataires ?? [];
    if (current.includes(e164)) {
      toast.error("Ce numéro est déjà dans la liste");
      return;
    }
    await updateConfig({ test_destinataires: [...current, e164] });
  };

  const removeTestDestinataire = async (numero: string) => {
    if (!config) return;
    const current = config.test_destinataires ?? [];
    await updateConfig({ test_destinataires: current.filter((n) => n !== numero) });
  };

  return {
    config,
    loading,
    updateConfig,
    addTestDestinataire,
    removeTestDestinataire,
    refetch: fetchConfig,
  };
}
