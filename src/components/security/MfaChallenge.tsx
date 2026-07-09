import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMfa } from "@/hooks/useMfa";
import { logSecurityEvent } from "@/hooks/useSecurityAudit";
import { supabase } from "@/integrations/supabase/client";
import { sha256 } from "@/lib/crypto";
import { toast } from "sonner";

interface Props {
  onSuccess: () => void;
  onSignOut: () => void;
}

/** Challenge MFA affiché après login quand le niveau requis est aal2 */
export default function MfaChallenge({ onSuccess, onSignOut }: Props) {
  const { factors, challenge, verifyChallenge } = useMfa();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);

  const verifiedFactor = factors.find((f) => f.status === "verified");

  const handleVerify = async () => {
    if (!verifiedFactor) return;
    if (code.length < 6) return toast.error("Code requis");

    // Vérouillage anti brute-force
    const { data: locked } = await supabase.rpc("is_mfa_locked");
    if (locked) {
      toast.error("Trop d'échecs. Compte temporairement verrouillé (15 min).");
      return;
    }

    setLoading(true);
    try {
      const ch = await challenge(verifiedFactor.id);
      await verifyChallenge(verifiedFactor.id, ch.id, code);
      await supabase.rpc("reset_failed_mfa");
      await logSecurityEvent("mfa_challenge_success", "info");
      onSuccess();
    } catch (e: any) {
      const { data } = await supabase.rpc("register_failed_mfa");
      const remaining = 5 - (data as any)?.attempts;
      toast.error(
        remaining > 0
          ? `Code invalide. ${remaining} essai${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}.`
          : "Compte verrouillé pour 15 minutes."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (code.length < 8) return toast.error("Code de secours invalide");
    setLoading(true);
    try {
      const hash = await sha256(code.trim().toUpperCase());
      const { data, error } = await supabase.rpc("consume_backup_code", { _code_hash: hash });
      if (error || !data) {
        toast.error("Code de secours invalide ou déjà utilisé");
        await supabase.rpc("register_failed_mfa");
        return;
      }
      await supabase.rpc("reset_failed_mfa");
      await logSecurityEvent("mfa_backup_used_login", "warning");
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-elegant)] p-8 space-y-6"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-9 w-9 sm:h-7 sm:w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-display">Vérification en deux étapes</h1>
          <p className="text-sm text-muted-foreground">
            {useBackup ? "Saisissez un code de secours" : "Saisissez le code à 6 chiffres de votre application"}
          </p>
        </div>

        <div className="space-y-3">
          <Label>{useBackup ? "Code de secours" : "Code de l'authentificateur"}</Label>
          <Input
            inputMode={useBackup ? "text" : "numeric"}
            maxLength={useBackup ? 9 : 6}
            value={code}
            onChange={(e) => setCode(useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
            placeholder={useBackup ? "XXXX-XXXX" : "123456"}
            className="text-center text-2xl tracking-[0.4em] font-mono"
            autoFocus
          />
        </div>

        <Button
          onClick={useBackup ? handleBackup : handleVerify}
          disabled={loading || (useBackup ? code.length < 8 : code.length < 6)}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Vérifier
        </Button>

        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => { setUseBackup(!useBackup); setCode(""); }}
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <KeyRound className="h-3 w-3" />
            {useBackup ? "Utiliser l'authentificateur" : "Utiliser un code de secours"}
          </button>
          <button onClick={onSignOut} className="text-muted-foreground hover:text-foreground">
            Se déconnecter
          </button>
        </div>
      </motion.div>
    </div>
  );
}
