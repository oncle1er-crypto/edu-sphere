import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, GraduationCap } from "lucide-react";

/**
 * Page publique de vérification d'une carte scolaire.
 * Route : /carte-scolaire/verification/:token
 * Affiche uniquement les informations strictement nécessaires.
 */
export default function StudentCardVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [eleve, setEleve] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("eleves")
          .select("id, nom, prenom, matricule, classe_nom, statut, photo_url, annee_scolaire")
          .or(`id.eq.${token},matricule.eq.${token}`)
          .maybeSingle();
        if (!active) return;
        if (!data) {
          setNotFound(true);
        } else {
          setEleve(data);
        }
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const valide =
    eleve && (eleve.statut === "actif" || eleve.statut === "inscrit");

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FBF5E8] to-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#6E1A2C] text-white shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold text-[#6E1A2C]">
            Vérification de carte scolaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Complexe Scolaire La Providence de Don Orione
          </p>
        </div>

        <Card className="border-2 border-[#C9A24B]/40 shadow-xl">
          <CardContent className="p-6 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#6E1A2C]" />
                <p className="text-sm text-muted-foreground">Vérification…</p>
              </div>
            ) : notFound || !eleve ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <ShieldAlert className="h-10 w-10 text-red-600" />
                <p className="font-bold text-red-700">Carte introuvable</p>
                <p className="text-sm text-muted-foreground">
                  Le QR code scanné ne correspond à aucune carte scolaire valide.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {valide ? (
                    <>
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                      <p className="font-bold text-emerald-700">Carte valide</p>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-6 w-6 text-amber-600" />
                      <p className="font-bold text-amber-700">Carte non active</p>
                    </>
                  )}
                  <Badge variant={valide ? "default" : "destructive"} className="ml-auto capitalize">
                    {eleve.statut ?? "—"}
                  </Badge>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Row label="Nom" value={eleve.nom ?? "—"} />
                  <Row label="Prénom" value={eleve.prenom ?? "—"} />
                  <Row label="Matricule" value={eleve.matricule ?? "—"} />
                  <Row label="Classe" value={eleve.classe_nom ?? "—"} />
                  <Row
                    label="Année scolaire"
                    value={eleve.annee_scolaire ?? "2025 - 2026"}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:underline">
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
