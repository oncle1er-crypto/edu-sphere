import { useMemo } from "react";
import { motion } from "framer-motion";
import { ScrollText, AlertTriangle, ShieldCheck, Info, RefreshCw } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSecurityAudit, SecurityLog } from "@/hooks/useSecurityAudit";

const EVENT_LABELS: Record<string, string> = {
  session_started: "Connexion réussie",
  mfa_enabled: "MFA activé",
  mfa_disabled: "MFA désactivé",
  mfa_challenge_success: "Vérification MFA réussie",
  mfa_failed_attempt: "Échec MFA",
  mfa_enrollment_failed: "Échec activation MFA",
  mfa_backup_code_used: "Code de secours utilisé",
  mfa_backup_code_invalid: "Code de secours invalide",
  mfa_backup_used_login: "Code de secours utilisé pour login",
  mfa_backup_regenerated: "Codes de secours régénérés",
  mfa_reset_by_admin: "MFA réinitialisé par admin",
  new_device_detected: "Nouvel appareil détecté",
  trusted_device_revoked: "Appareil révoqué",
  password_changed: "Mot de passe modifié",
};

function severityColor(s: SecurityLog["event_severity"]) {
  if (s === "critical") return "bg-destructive text-destructive-foreground";
  if (s === "warning") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function severityIcon(s: SecurityLog["event_severity"]) {
  if (s === "critical") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (s === "warning") return <Info className="h-3.5 w-3.5" />;
  return <ShieldCheck className="h-3.5 w-3.5" />;
}

export default function SecurityHistory() {
  const { logs, loading, refresh } = useSecurityAudit(200);

  const grouped = useMemo(() => {
    const out: Record<string, SecurityLog[]> = {};
    for (const l of logs) {
      const d = new Date(l.created_at).toLocaleDateString("fr-FR");
      (out[d] = out[d] || []).push(l);
    }
    return out;
  }, [logs]);

  return (
    <SettingsSection
      title="Historique de sécurité"
      description="Tous les événements liés à votre compte et à la sécurité de l'établissement."
      icon={<ScrollText className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      {logs.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun événement enregistré.</p>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{date}</div>
            <div className="space-y-1">
              {entries.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition"
                >
                  <Badge className={`${severityColor(l.event_severity)} gap-1 border-0`}>
                    {severityIcon(l.event_severity)}
                    {l.event_severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {EVENT_LABELS[l.event_type] || l.event_type}
                    </p>
                    {l.user_agent && (
                      <p className="text-xs text-muted-foreground truncate">{l.user_agent}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(l.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
