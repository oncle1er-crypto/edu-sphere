import { ShieldCheck, Smartphone, KeyRound, LogOut, Globe, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMfa } from "@/hooks/useMfa";
import { logSecurityEvent } from "@/hooks/useSecurityAudit";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export default function SecuritySettings() {
  const { user } = useAuth();
  const { isEnrolled } = useMfa();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleChangePassword = async () => {
    if (pwd.next.length < 6) return toast.error("Minimum 6 caractères requis");
    if (pwd.next !== pwd.confirm) return toast.error("Les mots de passe ne correspondent pas");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSaving(false);
    if (error) toast.error(messageErreurBase(error));
    else {
      toast.success("Mot de passe modifié");
      setPwd({ next: "", confirm: "" });
      await logSecurityEvent("password_changed", "warning");
    }
  };

  const handleSignOutAll = async () => {
    setSigningOut(true);
    await logSecurityEvent("global_signout", "critical");
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSigningOut(false);
    if (error) toast.error(messageErreurBase(error));
    else { toast.success("Toutes les sessions ont été fermées"); navigate("/auth", { replace: true }); }
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Mot de passe"
        description="Modifiez votre mot de passe régulièrement pour plus de sécurité."
        icon={<KeyRound className="h-5 w-5" />}
        hideSave
      >
        <FieldRow label="Nouveau mot de passe" hint="Min. 6 caractères">
          <Input type="password" value={pwd.next} onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} placeholder="••••••••" />
        </FieldRow>
        <FieldRow label="Confirmer">
          <Input type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
        </FieldRow>
        <div className="flex justify-end">
          <Button onClick={handleChangePassword} disabled={saving || !pwd.next}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Modifier le mot de passe
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Authentification à deux facteurs (2FA)"
        description={isEnrolled ? "MFA activé — protection renforcée." : "Activez le MFA pour sécuriser votre compte."}
        icon={<Smartphone className="h-5 w-5" />}
        hideSave
      >
        <Button asChild variant={isEnrolled ? "outline" : "default"} className="w-full justify-between">
          <Link to="/parametres/mfa">
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {isEnrolled ? "Gérer le MFA" : "Configurer le MFA"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        description="Gestion des connexions actives sur votre compte."
        icon={<Globe className="h-5 w-5" />}
        hideSave
      >
        <div className="text-sm text-muted-foreground">
          Connecté en tant que <span className="font-medium text-foreground">{user?.email}</span>
        </div>
        <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleSignOutAll} disabled={signingOut}>
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Déconnecter toutes les sessions
        </Button>
      </SettingsSection>
    </div>
  );
}
