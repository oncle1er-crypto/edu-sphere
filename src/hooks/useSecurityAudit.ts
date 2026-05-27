import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SecurityLog = {
  id: string;
  event_type: string;
  event_severity: "info" | "warning" | "critical";
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  metadata: any;
  created_at: string;
};

export function useSecurityAudit(limit = 100) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("security_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    setLogs((data ?? []) as SecurityLog[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, loading, refresh };
}

/** Helper pour enregistrer un événement sécurité depuis n'importe où */
export async function logSecurityEvent(
  eventType: string,
  severity: "info" | "warning" | "critical" = "info",
  metadata: Record<string, any> = {},
  ecoleId?: string
) {
  try {
    await supabase.rpc("log_security_event", {
      _event_type: eventType,
      _severity: severity,
      _ecole_id: ecoleId ?? null,
      _ip: null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _device_fp: null,
      _metadata: metadata,
    });
  } catch (e) {
    // silencieux : ne jamais casser l'app pour un log
    console.warn("logSecurityEvent failed", e);
  }
}
