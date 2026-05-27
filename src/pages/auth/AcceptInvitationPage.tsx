import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) { setVerifying(false); setReason("not_found"); return; }
      const { data, error } = await supabase.functions.invoke("accept-teacher-invitation", {
        body: { token, action: "verify" },
      });
      if (error || !data?.ok) {
        setValid(false);
        setReason(data?.reason ?? "not_found");
      } else {
        setValid(true);
        setEmail(data.email);
        setName(data.name);
      }
      setVerifying(false);
    };
    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Mot de passe : 8 caractères min.");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-teacher-invitation", {
        body: { token, password },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? data?.reason ?? "Erreur");
      toast.success("Mot de passe défini ! Connectez-vous.");
      // Auto-connexion si email connu
      if (email) {
        await supabase.auth.signInWithPassword({ email, password });
        navigate("/");
      } else {
        navigate("/connexion");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const reasonText: Record<string, string> = {
    not_found: "Ce lien d'invitation est invalide.",
    expired: "Ce lien a expiré. Demandez à votre administrateur d'en renvoyer un.",
    already_used: "Ce lien a déjà été utilisé. Connectez-vous normalement.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {verifying ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> :
             valid ? <ShieldCheck className="h-6 w-6 text-primary" /> :
             <AlertTriangle className="h-6 w-6 text-destructive" />}
          </div>
          <CardTitle>Activation du compte enseignant</CardTitle>
          <CardDescription>
            {verifying ? "Vérification du lien…" :
             valid ? `Bienvenue ${name ?? ""}. Définissez votre mot de passe.` :
             reasonText[reason ?? "not_found"]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!verifying && valid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {email && (
                <div className="text-sm bg-muted rounded-md p-2 text-center">
                  Email : <strong>{email}</strong>
                </div>
              )}
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type={show ? "text" : "password"} className="pl-9 pr-9" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-3 text-muted-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
              </div>
              <div className="space-y-2">
                <Label>Confirmer</Label>
                <Input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activer mon compte
              </Button>
            </form>
          )}
          {!verifying && !valid && (
            <Button variant="outline" className="w-full" onClick={() => navigate("/connexion")}>
              Aller à la connexion
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
