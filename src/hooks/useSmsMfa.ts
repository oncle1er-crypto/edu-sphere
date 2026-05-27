import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SmsFactor = {
  id: string;
  phone: string;
  verified: boolean;
  friendly_name: string | null;
  last_used_at: string | null;
  created_at: string;
};

export function useSmsMfa() {
  const [factor, setFactor] = useState<SmsFactor | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mfa_sms_factors").select("*").maybeSingle();
    setFactor((data as SmsFactor | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const sendOtp = useCallback(
    async (opts: { phone?: string; ecole_id?: string; purpose: "enroll" | "challenge" }) => {
      const { data, error } = await supabase.functions.invoke("send-mfa-sms-otp", { body: opts });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: true; expires_at: string };
    },
    []
  );

  const verifyOtp = useCallback(
    async (code: string, purpose: "enroll" | "challenge") => {
      const { data, error } = await supabase.functions.invoke("verify-mfa-sms-otp", {
        body: { code, purpose },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await refresh();
      return data as { ok: true };
    },
    [refresh]
  );

  const remove = useCallback(async () => {
    await supabase.from("mfa_sms_factors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await refresh();
  }, [refresh]);

  return { factor, loading, refresh, sendOtp, verifyOtp, remove, isEnrolled: !!factor?.verified };
}
