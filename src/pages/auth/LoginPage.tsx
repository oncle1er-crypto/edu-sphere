import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User,
  Lock,
  LogIn,
  UserPlus,
  Chrome,
  Eye,
  EyeOff,
  ShieldCheck,
  BookOpen,
  Users,
  GraduationCap,
  Loader2,
} from "lucide-react";
import heroImg from "@/assets/login-hero.jpg";
import logoImg from "@/assets/login-logo.png";

const NAVY = "#071B3B";
const GOLD = "#D4A017";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
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
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row font-sans"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}
    >
      {/* ============ LEFT — BRANDING ============ */}
      <section
        className="relative flex-1 lg:flex-[1.1] overflow-hidden text-white px-6 sm:px-10 lg:px-14 py-10 lg:py-12 flex flex-col"
        style={{ backgroundColor: NAVY }}
      >
        {/* Hero background */}
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Complexe Scolaire La Providence de Don Orione"
            className="h-full w-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${NAVY}F2 0%, ${NAVY}D9 50%, ${NAVY}99 100%)`,
            }}
          />
        </div>

        {/* Decorative dots top-left */}
        <div className="pointer-events-none absolute top-6 left-6 grid grid-cols-6 gap-2 opacity-40">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: GOLD }} />
          ))}
        </div>

        {/* Curved gold accent bottom */}
        <svg
          className="pointer-events-none absolute -bottom-1 left-0 right-0 w-full h-32 opacity-90"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <path
            d="M0,120 C300,40 700,200 1200,80 L1200,200 L0,200 Z"
            fill={GOLD}
            opacity="0.18"
          />
          <path
            d="M0,150 C300,80 700,220 1200,110"
            fill="none"
            stroke={GOLD}
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>

        {/* Glow */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl"
          style={{ backgroundColor: GOLD, opacity: 0.18 }}
        />

        <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto lg:mx-0 animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ backgroundColor: GOLD, opacity: 0.35 }}
              />
              <img
                src={logoImg}
                alt="Logo Complexe Scolaire La Providence de Don Orione"
                className="relative h-32 w-32 sm:h-40 sm:w-40 object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Title */}
          <div className="mt-6 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              COMPLEXE SCOLAIRE
            </h1>
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-1"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #F5D061 50%, ${GOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              LA PROVIDENCE DE DON ORIONE
            </h2>
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-4">
              <span className="h-px w-10" style={{ backgroundColor: GOLD }} />
              <GraduationCap className="h-4 w-4" style={{ color: GOLD }} />
              <span className="h-px w-10" style={{ backgroundColor: GOLD }} />
            </div>
            <p className="mt-5 text-sm sm:text-base text-white/80 max-w-lg mx-auto lg:mx-0">
              Bienvenue sur votre plateforme de gestion scolaire complète,
              sécurisée et intelligente.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            {[
              {
                icon: ShieldCheck,
                title: "Sécurisé & Fiable",
                text: "Vos données protégées avec les meilleurs standards.",
              },
              {
                icon: BookOpen,
                title: "Suivi Pédagogique",
                text: "Notes, bulletins et progression de chaque élève.",
              },
              {
                icon: Users,
                title: "Communauté Éducative",
                text: "Élèves, enseignants et parents connectés.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center sm:text-left transition-all hover:bg-white/10 hover:-translate-y-0.5 hover:border-white/20"
              >
                <Icon className="h-6 w-6 mb-2 mx-auto sm:mx-0" style={{ color: GOLD }} />
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="mt-auto pt-10 text-center lg:text-left">
            <p
              className="italic text-base sm:text-lg text-white/85"
              style={{ fontFamily: "Georgia, serif" }}
            >
              <span style={{ color: GOLD }}>“</span>
              Éduquer aujourd'hui, construire demain.
              <span style={{ color: GOLD }}>”</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ RIGHT — LOGIN ============ */}
      <section className="relative flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 sm:px-8 py-10">
        {/* Decorative gold curve */}
        <svg
          className="pointer-events-none absolute top-0 right-0 w-64 h-64 opacity-40"
          viewBox="0 0 200 200"
        >
          <path
            d="M200,0 Q120,40 200,200 Z"
            fill={GOLD}
            opacity="0.15"
          />
        </svg>

        <div className="w-full max-w-md animate-scale-in">
          <div className="rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(7,27,59,0.25)] border border-slate-100 p-7 sm:p-9">
            {/* Avatar icon */}
            <div className="flex justify-center">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white"
                style={{
                  background: `linear-gradient(135deg, ${NAVY} 0%, #0F2952 100%)`,
                  boxShadow: `0 10px 30px -10px ${NAVY}`,
                }}
              >
                <User className="h-7 w-7" style={{ color: GOLD }} strokeWidth={2.2} />
              </div>
            </div>

            <div className="text-center mt-5">
              <h2
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: NAVY }}
              >
                {isSignUp ? "Inscription" : "Connexion"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isSignUp
                  ? "Créez votre espace administrateur"
                  : "Accédez à votre espace administrateur"}
              </p>
              <div className="mt-3 flex justify-center">
                <span className="h-1 w-12 rounded-full" style={{ backgroundColor: GOLD }} />
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="mt-7 space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold" style={{ color: NAVY }}>
                    Nom complet
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[color:var(--gold)]" style={{ ["--gold" as any]: GOLD }} />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean Kouassi"
                      required
                      className="pl-11 h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-offset-0 transition-all"
                      style={{ ["--tw-ring-color" as any]: GOLD }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: NAVY }}>
                  Identifiant
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-amber-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Entrez votre identifiant"
                    required
                    className="pl-11 h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-0 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: NAVY }}>
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-amber-500" />
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    required
                    minLength={6}
                    className="pl-11 pr-11 h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-0 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    aria-label={showPwd ? "Masquer" : "Afficher"}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-600 hover:text-amber-600 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-white font-semibold text-base shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-80 disabled:translate-y-0"
                style={{
                  background: `linear-gradient(110deg, ${NAVY} 0%, #0F2952 55%, ${GOLD} 180%)`,
                  boxShadow: `0 10px 25px -10px ${NAVY}`,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : isSignUp ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Créer le compte
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Se connecter
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase tracking-wider text-slate-400">ou</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Chrome className="h-4 w-4" />
                Continuer avec Google
              </Button>



            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              {isSignUp ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold hover:underline transition-colors"
                style={{ color: NAVY }}
              >
                {isSignUp ? "Se connecter" : "Créer un compte"}
              </button>
            </p>
          </div>

          {/* Footer info row */}
          <div className="mt-7 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: GraduationCap, t: "Plateforme éducative", s: "Moderne et intuitive" },
              { icon: ShieldCheck, t: "100% Sécurisé", s: "Données protégées" },
              { icon: Users, t: "Communauté unie", s: "Parents & enseignants" },
            ].map(({ icon: Icon, t, s }) => (
              <div key={t} className="flex flex-col items-center gap-1">
                <Icon className="h-4 w-4" style={{ color: GOLD }} />
                <span className="text-[11px] sm:text-xs font-semibold" style={{ color: NAVY }}>
                  {t}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
                  {s}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5 leading-relaxed">
            © 2026 Complexe Scolaire La Providence de Don Orione
            <br />
            Tous droits réservés.
          </p>
        </div>
      </section>
    </div>
  );
}
