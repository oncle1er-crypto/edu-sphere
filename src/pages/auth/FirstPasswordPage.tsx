import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function FirstPasswordPage() {
  const navigate = useNavigate();
  const { user, refreshMustChangePassword } = useAuth() as any;
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("6 caractères minimum");
    if (pwd !== pwd2) return toast.error("Les deux mots de passe ne correspondent pas");
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);
      if (pErr) throw pErr;
      toast.success("Mot de passe défini !");
      await refreshMustChangePassword?.();
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-5 border">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Définissez votre mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pour votre 1ère connexion, choisissez un mot de passe personnel (6 caractères minimum).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Nouveau mot de passe</Label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={6} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Confirmer</Label>
          <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} minLength={6} required />
        </div>
        <Button type="submit" disabled={saving} className="w-full h-11">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Enregistrer et continuer
        </Button>
      </form>
    </div>
  );
}
