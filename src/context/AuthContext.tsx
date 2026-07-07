import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { purgeSensitiveCaches } from "@/pwa/registerSW";
import { toast } from "sonner";


interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Évènements jugés critiques → déconnexion immédiate des autres sessions. */
const SUSPICIOUS_EVENTS = new Set([
  "mfa_account_locked",
  "mfa_reset_by_admin",
  "trusted_device_revoked",
  "password_changed",
  "suspicious_login_blocked",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-logout sur inactivité (30 min)
  useSessionTimeout(30 * 60 * 1000);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
        // Purger tout cache navigation à la connexion/déconnexion pour éviter
        // qu'une page d'auth/MFA stockée puisse être servie depuis le SW.
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          void purgeSensitiveCaches();
        }
      }
    );


    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Écoute Realtime des évènements suspects → déconnexion automatique
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    const channel = supabase
      .channel(`security-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_audit_logs",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const ev = (payload.new as any)?.event_type as string | undefined;
          const sev = (payload.new as any)?.event_severity as string | undefined;
          if (!ev) return;
          if (SUSPICIOUS_EVENTS.has(ev) || sev === "critical") {
            toast.error("Activité suspecte détectée. Vous avez été déconnecté.");
            await supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

