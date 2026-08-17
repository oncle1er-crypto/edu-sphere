import { ReactNode, useEffect, useState } from "react";
import { useMfa } from "@/hooks/useMfa";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MfaChallenge from "./MfaChallenge";
import { AppLoader } from "@/components/loading";
import { recordCurrentDevice } from "@/hooks/useTrustedDevices";
import { logSecurityEvent } from "@/hooks/useSecurityAudit";

/**
 * Middleware global qui :
 * - force la vérification MFA quand Supabase indique aal2 requis (nextLevel)
 * - vérifie via RPC si MFA obligatoire mais non encore configuré → laisse passer
 *   mais affichera un bandeau via MfaEnforcementBanner.
 * - enregistre l'appareil et les événements de connexion.
 */
export default function MfaGuard({ children }: { children: ReactNode }) {
  const { user, signOut, session } = useAuth();
  const { currentLevel, nextLevel, loading } = useMfa();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!user?.id || !session) return;
    (async () => {
      try {
        await recordCurrentDevice(user.id);
        await logSecurityEvent("session_started", "info", {
          email: user.email,
          aal: currentLevel,
        });
      } catch (e) {
        // Best-effort (device recording / audit log) : ne doit jamais bloquer
        // l'accès, mais une erreur silencieuse ici pouvait masquer un vrai
        // bug dans recordCurrentDevice/logSecurityEvent indéfiniment.
        console.warn("MfaGuard: échec de l'enregistrement de session (non bloquant)", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!session) return <>{children}</>;
  if (loading) return <AppLoader label="Vérification de sécurité…" />;

  const mustChallenge =
    nextLevel === "aal2" && currentLevel === "aal1" && !verified;

  if (mustChallenge) {
    return (
      <MfaChallenge
        onSuccess={() => setVerified(true)}
        onSignOut={async () => {
          await supabase.auth.signOut();
          await signOut?.();
        }}
      />
    );
  }

  return <>{children}</>;
}
