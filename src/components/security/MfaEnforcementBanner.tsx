import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMfa } from "@/hooks/useMfa";
import { useSmsMfa } from "@/hooks/useSmsMfa";
import { Button } from "@/components/ui/button";

/** Bandeau global affiché si MFA obligatoire pour le rôle mais non configuré */
export default function MfaEnforcementBanner() {
  const { user } = useAuth();
  const { isEnrolled: totpEnrolled, loading: totpLoading } = useMfa();
  const { isEnrolled: smsEnrolled, loading: smsLoading } = useSmsMfa();
  const isEnrolled = totpEnrolled || smsEnrolled;
  const loading = totpLoading || smsLoading;
  const [required, setRequired] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .rpc("is_mfa_required_for_user", { _user_id: user.id })
      .then(({ data }) => setRequired(!!data));
  }, [user?.id]);

  if (loading || !required || isEnrolled || dismissed) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2 text-sm flex-1">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          Votre rôle exige l'authentification à deux facteurs.
        </span>
        <span className="hidden md:inline opacity-90">
          Activez-la maintenant pour sécuriser votre compte.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link to="/parametres/mfa">Activer maintenant</Link>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
