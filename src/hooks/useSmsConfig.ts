import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface SmsConfig {
  id: string;
  ecole_id: string;
  provider: string;
  api_token: string;
  sender_id: string;
  base_url: string;
  is_active: boolean;
  cout_unitaire: number;
}

export function useSmsConfig() {
  const { ecoleId } = useEcoleId();
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_config")
      .select("*")
      .eq("ecole_id", ecoleId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching sms_config:", error);
    }
    setConfig(data as SmsConfig | null);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetch(); }, [fetch]);

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
    toast.success("Configuration SMS enregistrée");
    await fetch();
  };

  const sendSms = async (destinataires: string[], message: string) => {
    if (!ecoleId) throw new Error("Pas d'école");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non connecté");

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await window.fetch(
      `https://${projectId}.supabase.co/functions/v1/send-sms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ecole_id: ecoleId, destinataires, message }),
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erreur d'envoi");
    return json as { sent: number; failed: number; total: number };
  };

  const testSms = async (phone: string) => {
    try {
      const result = await sendSms([phone], "Test SMS depuis GSP La Providence — Configuration réussie ✓");
      if (result.sent > 0) toast.success("SMS de test envoyé !");
      else toast.error("Échec de l'envoi du SMS de test");
      return result;
    } catch (e: any) {
      toast.error(e.message);
      throw e;
    }
  };

  return { config, loading, save, sendSms, testSms, refetch: fetch };
}
