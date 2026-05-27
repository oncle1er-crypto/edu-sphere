import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/crypto";
import { logSecurityEvent } from "./useSecurityAudit";

export type TrustedDevice = {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  last_seen_at: string;
  trusted_at: string;
  revoked_at: string | null;
};

export function useTrustedDevices() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trusted_devices")
      .select("*")
      .order("last_seen_at", { ascending: false });
    setDevices((data ?? []) as TrustedDevice[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const revoke = useCallback(
    async (id: string) => {
      await supabase
        .from("trusted_devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      await logSecurityEvent("trusted_device_revoked", "warning", { device_id: id });
      await refresh();
    },
    [refresh]
  );

  return { devices, loading, refresh, revoke };
}

/** À appeler après login pour détecter / enregistrer l'appareil courant */
export async function recordCurrentDevice(userId: string, label?: string) {
  const fp = await getDeviceFingerprint();
  const { data: existing } = await supabase
    .from("trusted_devices")
    .select("id, revoked_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fp)
    .maybeSingle();

  if (!existing) {
    await supabase.from("trusted_devices").insert({
      user_id: userId,
      device_fingerprint: fp,
      device_name: label ?? "Navigateur",
      user_agent: navigator.userAgent,
    });
    await logSecurityEvent("new_device_detected", "warning", { fingerprint: fp });
    return { isNew: true, fingerprint: fp };
  }

  await supabase
    .from("trusted_devices")
    .update({ last_seen_at: new Date().toISOString(), revoked_at: null })
    .eq("id", existing.id);

  return { isNew: false, fingerprint: fp };
}
