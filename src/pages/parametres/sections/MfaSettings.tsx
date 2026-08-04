import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldOff, Smartphone, KeyRound, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMfa } from "@/hooks/useMfa";
import { useSmsMfa } from "@/hooks/useSmsMfa";
import { useAuth } from "@/context/AuthContext";
import MfaSetupDialog from "@/components/security/MfaSetupDialog";
import { logSecurityEvent } from "@/hooks/useSecurityAudit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export default function MfaSettings() {
  const { user } = useAuth();
  const { factors, isEnrolled, loading, unenroll, generateBackupCodes, refresh } = useMfa();
  const smsMfa = useSmsMfa();
  const [setupOpen, setSetupOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [removingSms, setRemovingSms] = useState(false);
  const [activatingSms, setActivatingSms] = useState(false);

  const verified = factors.find((f) => f.status === "verified");
  const smsFactor = smsMfa.factor;
  const anyEnrolled = isEnrolled || smsMfa.isEnrolled || smsMfa.isPhoneVerified;

  const handleActivateSms = async () => {
    setActivatingSms(true);
    try {
      await smsMfa.activate();
      await logSecurityEvent("mfa_sms_enabled", "info");
      toast.success("MFA SMS activé");
    } catch (e: any) {
      toast.error(messageErreurBase(e));
    } finally { setActivatingSms(false); }
  };

  const handleDeactivateSms = async () => {
    try {
      await smsMfa.deactivate();
      await logSecurityEvent("mfa_sms_disabled", "warning");
      toast.success("MFA SMS désactivé (le numéro reste vérifié)");
    } catch (e: any) {
      toast.error(messageErreurBase(e));
    }
  };

  const handleRemoveSms = async () => {
    setRemovingSms(true);
    try {
      await smsMfa.remove();
      await logSecurityEvent("mfa_sms_removed", "critical");
      toast.success("Numéro et facteur SMS supprimés");
    } catch (e: any) {
      toast.error(messageErreurBase(e));
    } finally { setRemovingSms(false); }
  };

  const maskPhone = (p: string) => p.length <= 4 ? p : p.slice(0, -4).replace(/./g, "*") + p.slice(-4);


  const handleUnenroll = async () => {
    if (!verified) return;
    setUnenrolling(true);
    try {
      await unenroll(verified.id);
      await supabase.from("mfa_backup_codes").delete().eq("user_id", user!.id);
      await logSecurityEvent("mfa_disabled", "critical", { factor_id: verified.id });
      toast.success("MFA désactivé");
      await refresh();
    } catch (e: any) {
      toast.error(messageErreurBase(e));
    } finally {
      setUnenrolling(false);
    }
  };

  const regenerate = async () => {
    if (!user?.id) return;
    setRegenerating(true);
    try {
      const codes = await generateBackupCodes(user.id);
      setNewCodes(codes);
      await logSecurityEvent("mfa_backup_regenerated", "warning");
      toast.success("Nouveaux codes générés");
    } catch (e: any) {
      toast.error(messageErreurBase(e));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Authentification à deux facteurs (MFA)"
        description="Ajoutez une couche de sécurité supplémentaire en exigeant un code à usage unique en plus de votre mot de passe."
        icon={<ShieldCheck className="h-5 w-5" />}
        hideSave
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : anyEnrolled ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {verified && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Application Authenticator activée</p>
                    <Badge variant="secondary" className="text-xs">TOTP</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Appareil : {verified.friendly_name || "Authenticator"} · activé le{" "}
                    {new Date(verified.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Désactiver l'app Authenticator ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous devrez la reconfigurer à la prochaine activation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnenroll} disabled={unenrolling}>
                        {unenrolling && <Loader2 className="h-4 w-4 animate-spin" />} Désactiver
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {smsFactor?.verified && (
              <div
                className={`rounded-xl border p-4 flex items-start gap-3 ${
                  smsFactor.is_active
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/40 bg-amber-500/5"
                }`}
              >
                <Smartphone
                  className={`h-5 w-5 mt-0.5 ${smsFactor.is_active ? "text-emerald-600" : "text-amber-600"}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">
                      {smsFactor.is_active ? "SMS activé" : "Numéro vérifié — MFA SMS non activé"}
                    </p>
                    <Badge variant="secondary" className="text-xs">SMS</Badge>
                    {!smsFactor.is_active && (
                      <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400">
                        Inactif
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Numéro : <span className="font-mono">{maskPhone(smsFactor.phone)}</span>
                    {smsFactor.phone_verified_at &&
                      ` · vérifié le ${new Date(smsFactor.phone_verified_at).toLocaleDateString("fr-FR")}`}
                    {smsFactor.last_used_at &&
                      ` · dernière utilisation ${new Date(smsFactor.last_used_at).toLocaleDateString("fr-FR")}`}
                  </p>
                  {!smsFactor.is_active && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                      Votre numéro a bien été vérifié, mais le MFA SMS n'est pas encore actif.
                      Activez-le pour exiger un code à 6 chiffres à chaque connexion.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!smsFactor.is_active ? (
                    <Button
                      size="sm" variant="default" onClick={handleActivateSms} disabled={activatingSms}
                    >
                      {activatingSms && <Loader2 className="h-4 w-4 animate-spin" />} Activer
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">Désactiver</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Désactiver le MFA SMS ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Le numéro restera vérifié et pourra être réactivé sans nouveau code SMS.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeactivateSms}>Désactiver</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le numéro SMS ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le numéro vérifié et le facteur SMS seront supprimés. Une nouvelle
                          vérification par OTP sera nécessaire pour réactiver.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveSms} disabled={removingSms}>
                          {removingSms && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}


            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSetupOpen(true)}>
                <KeyRound className="h-4 w-4" /> Ajouter une autre méthode
              </Button>
              {isEnrolled && (
                <Button variant="outline" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Régénérer les codes de secours
                </Button>
              )}
            </div>

            {newCodes && (
              <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <p className="font-bold text-destructive">⚠️ Nouveaux codes — affichés une seule fois</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {newCodes.map((c) => <div key={c} className="text-center p-1 bg-background rounded">{c}</div>)}
                </div>
                <Button size="sm" variant="outline" onClick={() => setNewCodes(null)}>J'ai sauvegardé</Button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium">MFA non activé</p>
                <p className="text-muted-foreground mt-1">
                  Recommandé pour tous les comptes administratifs. Choisissez entre app Authenticator (TOTP) ou code par SMS.
                </p>
              </div>
            </div>
            <Button onClick={() => setSetupOpen(true)}>
              <KeyRound className="h-4 w-4" /> Activer maintenant
            </Button>
          </div>
        )}
      </SettingsSection>

      <MfaSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={() => { refresh(); smsMfa.refresh(); }}
      />
    </div>
  );
}
