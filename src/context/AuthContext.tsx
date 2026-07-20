import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { purgeSensitiveCaches } from "@/pwa/registerSW";
import { clearAllDrafts } from "@/hooks/useDraftForm";
import { toast } from "sonner";


interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  mustChangePassword: boolean;
  refreshMustChangePassword: () => Promise<void>;
  signOut: () => Promise<void>;
}


const AuthContext = createContext<AuthContextValue | null>(null);

/** Évènements jugés critiques → déconnexion immédiate des autres sessions.
 *  Doit être STRICTEMENT restrictif : un faux positif déconnecte l'utilisateur
 *  en pleine session. On n'y met QUE des events qui justifient une révocation
 *  immédiate de toutes les sessions (compromission avérée). */
const SUSPICIOUS_EVENTS = new Set([
  "mfa_account_locked",
  "mfa_reset_by_admin",
  "trusted_device_revoked",
  "password_changed",
  "suspicious_login_blocked",
]);

/** Délai (ms) après SIGNED_IN pendant lequel on ignore les events suspects.
 *  Évite qu'un event résiduel de la session précédente ne déconnecte
 *  immédiatement l'utilisateur qui vient de se reconnecter. */
const SUSPICIOUS_GRACE_MS = 20_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  // Timestamp du dernier SIGNED_IN — sert de garde anti-faux-positif pour le
  // listener Realtime « activité suspecte ».
  const [signedInAt, setSignedInAt] = useState<number>(0);

  const refreshMustChangePassword = async () => {
    const uid = session?.user?.id;
    if (!uid) { setMustChangePassword(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", uid)
      .maybeSingle();
    setMustChangePassword(!!(data as any)?.must_change_password);
  };


  // Auto-logout sur inactivité (8 h) — évite les déconnexions intempestives
  // lorsqu'on change d'onglet ou qu'on met l'écran en veille brièvement.
  useSessionTimeout(8 * 60 * 60 * 1000);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Ignore les TOKEN_REFRESHED / USER_UPDATED qui n'apportent aucun
        // changement d'utilisateur : ils provoquent sinon des re-rendus en
        // cascade (flash « Vérification… ») à chaque retour d'onglet.
        setSession((prev) => {
          if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            if (prev?.user?.id === newSession?.user?.id) return prev;
          }
          return newSession;
        });
        setLoading(false);
        if (event === "SIGNED_IN") {
          setSignedInAt(Date.now());
          void purgeSensitiveCaches();
        } else if (event === "SIGNED_OUT") {
          setSignedInAt(0);
          void purgeSensitiveCaches();
        }
      }
    );


    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setSignedInAt(Date.now());
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Écoute Realtime des évènements suspects → déconnexion automatique.
  // Filtre STRICT : on exige à la fois un event_type explicitement listé
  // ET une severity « critical », ET on ignore tout event pendant la
  // fenêtre de grâce qui suit une connexion (évite les faux positifs
  // dus à un log résiduel de la session précédente).
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
          // Fenêtre de grâce post-login
          if (signedInAt && Date.now() - signedInAt < SUSPICIOUS_GRACE_MS) return;
          // Filtre strict : event listé ET severity critical
          if (SUSPICIOUS_EVENTS.has(ev) && sev === "critical") {
            toast.error("Activité suspecte détectée. Vous avez été déconnecté.");
            await supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, signedInAt]);

  // Recharger le flag "must_change_password" à chaque changement d'utilisateur.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setMustChangePassword(false); return; }
    supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => setMustChangePassword(!!(data as any)?.must_change_password));
  }, [session?.user?.id]);

  const signOut = async () => {
    clearAllDrafts();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, mustChangePassword, refreshMustChangePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

