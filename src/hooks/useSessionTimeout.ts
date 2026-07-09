import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "./useSecurityAudit";
import { toast } from "sonner";

/**
 * Déconnecte automatiquement l'utilisateur après une période d'inactivité.
 * Par défaut: 30 minutes. Réinitialisé sur activité souris/clavier/tactile.
 */
export function useSessionTimeout(timeoutMs = 30 * 60 * 1000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned = useRef(false);

  useEffect(() => {
    const expire = async () => {
      await logSecurityEvent("session_idle_expired", "warning", {
        timeout_minutes: Math.round(timeoutMs / 60_000),
      });
      toast.warning("Session expirée pour inactivité. Veuillez vous reconnecter.");
      await supabase.auth.signOut();
    };

    const warn = () => {
      if (warned.current) return;
      warned.current = true;
      toast.info("Vous serez déconnecté dans 1 minute pour inactivité.");
    };

    const reset = () => {
      warned.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      warnTimer.current = setTimeout(warn, Math.max(0, timeoutMs - 60_000));
      timer.current = setTimeout(expire, timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll", "pointerdown", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    // Réinitialiser aussi quand l'onglet redevient visible (retour depuis
    // une autre app / veille écran) pour éviter une déconnexion surprise.
    const onVisibility = () => { if (document.visibilityState === "visible") reset(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reset);
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reset);
    };
  }, [timeoutMs]);
}

