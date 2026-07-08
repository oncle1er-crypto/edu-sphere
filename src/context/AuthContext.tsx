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
      (event, newSession) => {
        // Ignore les TOKEN_REFRESHED (déclenchés à chaque retour d'onglet) :
        // ils changent la référence session sans que rien ne change réellement
        // et provoquent des re-rendus de toute l'app (flash "Vérification…").
        setSession((prev) => {
          if (event === "TOKEN_REFRESHED") {
            // On garde la même référence si l'utilisateur est identique.
            if (prev?.user?.id === newSession?.user?.id) return prev;
          }
          return newSession;
        });
        setLoading(false);
        // Purger le cache navigation uniquement lors d'une vraie transition
        // d'authentification (jamais sur TOKEN_REFRESHED).
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
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

