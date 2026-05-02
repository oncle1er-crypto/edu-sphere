import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus, Chrome } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Compte créé !", {
          description: "Vérifiez votre email pour confirmer votre inscription.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Erreur Google", { description: String(result.error) });
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary font-display">GSP</span>
          </div>
          <h1 className="text-xl font-bold font-display text-primary">
            Groupe Scolaire La Providence
          </h1>
          <p className="text-xs text-muted-foreground italic">Foi, Savoir, Excellence</p>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Créer un compte" : "Connexion à votre espace"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            type="button"
          >
            <Chrome className="h-4 w-4 mr-2" />
            Continuer avec Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Kouassi"
                  required={isSignUp}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gsp.ci"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Chargement…"
              ) : isSignUp ? (
                <><UserPlus className="h-4 w-4 mr-2" />Créer le compte</>
              ) : (
                <><LogIn className="h-4 w-4 mr-2" />Se connecter</>
              )}
            </Button>
          </form>

          {!isSignUp && (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary">Accès démo</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium">Email :</span>
                <span>admin@gsp.ci</span>
                <span className="font-medium">Mot de passe :</span>
                <span>admin123</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.signInWithPassword({
                      email: "admin@gsp.ci",
                      password: "admin123",
                    });
                    if (error) throw error;
                    navigate("/");
                  } catch (err: any) {
                    toast.error("Erreur", { description: err.message });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <LogIn className="h-3 w-3 mr-1" />
                Connexion rapide démo
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Se connecter" : "Créer un compte"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
