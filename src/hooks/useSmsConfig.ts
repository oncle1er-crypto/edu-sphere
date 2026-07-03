import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface SmsConfig {
  id: string;
  ecole_id: string;
  provider: string;
  /** Never populated on the client — the raw token is not readable via the API. */
  api_token: string;
  /** Last 4 characters of the stored token, for display only. */
  api_token_last4: string | null;
  /** True when a token is configured server-side. */
  has_api_token: boolean;
  sender_id: string;
  base_url: string;
  is_active: boolean;
  cout_unitaire: number;
  whatsapp_url: string;
  whatsapp_enabled: boolean;
  whatsapp_cout_unitaire: number;
}

/** Mask a token given its last 4 chars. */
export function maskToken(tokenOrLast4: string): string {
  if (!tokenOrLast4) return "";
  const tail = tokenOrLast4.length <= 4 ? tokenOrLast4 : tokenOrLast4.slice(-4);
  return "••••••••" + tail;
}

// Columns explicitly excluded from client selects — api_token is column-revoked
// server-side, but we also avoid asking for it to prevent noisy errors.
const CLIENT_COLUMNS =
  "id, ecole_id, provider, api_token_last4, has_api_token, sender_id, base_url, is_active, cout_unitaire, whatsapp_url, whatsapp_enabled, whatsapp_cout_unitaire";

export function useSmsConfig() {
  const { ecoleId } = useEcoleId();
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_config")
      .select(CLIENT_COLUMNS)
      .eq("ecole_id", ecoleId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching sms_config:", error);
    }
    setConfig(data as SmsConfig | null);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = async (values: Partial<SmsConfig>) => {
    if (!ecoleId) return;
    const payload = { ...values, ecole_id: ecoleId };

    if (config?.id) {
      const { error } = await supabase
        .from("sms_config")
        .update(payload)
        .eq("id", config.id);
      if (error) { toast.error("Erreur de sauvegarde"); return; }
    } else {
      const { error } = await supabase
        .from("sms_config")
        .insert(payload);
      if (error) { toast.error("Erreur de création"); return; }
    }
    toast.success("Configuration enregistrée");
    await fetchConfig();
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const invoke = async (fn: "send-sms" | "send-whatsapp", body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non connecté");
    const res = await window.fetch(
      `https://${projectId}.supabase.co/functions/v1/${fn}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erreur d'envoi");
    return json as { sent: number; failed: number; total: number };
  };

  const sendSms = async (destinataires: string[], message: string) => {
    if (!ecoleId) throw new Error("Pas d'école");
    return invoke("send-sms", { ecole_id: ecoleId, destinataires, message });
  };

  const sendWhatsApp = async (
    destinataires: string[],
    opts: { message?: string; template_name?: string; variables?: Record<string, string> | string[] }
  ) => {
    if (!ecoleId) throw new Error("Pas d'école");
    return invoke("send-whatsapp", { ecole_id: ecoleId, destinataires, ...opts });
  };

  const testSms = async (phone: string) => {
    try {
      const result = await sendSms([phone], "Test SMS GSP - Configuration reussie. Merci.");
      if (result.sent > 0) toast.success("SMS de test envoyé !");
      else toast.error("Échec de l'envoi du SMS de test");
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      throw e;
    }
  };

  const testWhatsApp = async (phone: string) => {
    try {
      const result = await sendWhatsApp([phone], {
        message: "Test WhatsApp GSP - Configuration YellikaSMS réussie. Merci.",
      });
      if (result.sent > 0) toast.success("Message WhatsApp de test envoyé !");
      else toast.error("Échec de l'envoi WhatsApp de test");
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      throw e;
    }
  };

  return { config, loading, save, sendSms, sendWhatsApp, testSms, testWhatsApp, refetch: fetchConfig };
}
