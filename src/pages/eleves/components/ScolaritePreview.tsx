import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, AlertCircle } from "lucide-react";

interface Props {
  ecoleId: string | null;
  anneeId: string | null;
  classeNom: string | null;
  estNouveau?: boolean;
}

interface TarifInfo {
  libelle: string;
  niveau_code: string;
  variant: string | null;
  montant_total: number;
  tranches: any[] | null;
  source: "grille" | "cycle";
}

export function ScolaritePreview({ ecoleId, anneeId, classeNom, estNouveau }: Props) {
  const [loading, setLoading] = useState(false);
  const [tarif, setTarif] = useState<TarifInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ecoleId || !anneeId || !classeNom) { setTarif(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null); setTarif(null);
      const { data: niveauData } = await supabase.rpc("resoudre_niveau_code" as any, { _classe_nom: classeNom });
      const niveau = (niveauData as string | null) ?? null;
      if (!niveau) {
        if (!cancelled) { setError("Niveau non résolu pour cette classe"); setLoading(false); }
        return;
      }
      const variant = niveau === "GS" ? (estNouveau ? "nouveau" : "ancien") : null;
      let q = supabase.from("grille_tarifs_niveaux")
        .select("libelle, niveau_code, variant, montant_total, tranches")
        .eq("ecole_id", ecoleId).eq("annee_id", anneeId).eq("niveau_code", niveau);
      q = variant ? q.eq("variant", variant) : q.is("variant", null);
      const { data } = await q.maybeSingle();
      if (cancelled) return;
      if (data) {
        setTarif({ ...data, source: "grille" } as TarifInfo);
      } else if (niveau === "GS" && variant === "ancien") {
        // Fallback : pas de tarif ancien → utiliser le tarif "nouveau"
        const { data: alt } = await supabase.from("grille_tarifs_niveaux")
          .select("libelle, niveau_code, variant, montant_total, tranches")
          .eq("ecole_id", ecoleId).eq("annee_id", anneeId).eq("niveau_code", niveau)
          .eq("variant", "nouveau").maybeSingle();
        if (alt) setTarif({ ...alt, source: "grille" } as TarifInfo);
        else setError("Aucun tarif configuré pour ce niveau");
      } else {
        setError("Aucun tarif configuré pour ce niveau");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ecoleId, anneeId, classeNom, estNouveau]);

  if (!classeNom) return null;

  return (
    <div className="rounded-md border bg-primary/5 border-primary/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Wallet className="h-4 w-4" /> Scolarité qui sera appliquée
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Calcul du tarif…
        </div>
      )}
      {error && !loading && (
        <div className="flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error} — vérifiez la grille tarifaire dans Finances › Grille des tarifs.</span>
        </div>
      )}
      {tarif && !loading && (
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Barème :</span>
            <span className="font-medium">{tarif.libelle}{tarif.variant ? ` (${tarif.variant})` : ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Montant annuel :</span>
            <span className="font-bold text-primary tabular-nums">
              {Number(tarif.montant_total).toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          {Array.isArray(tarif.tranches) && tarif.tranches.length > 0 && (
            <div className="pt-1 border-t border-primary/10">
              <p className="text-muted-foreground mb-1">Répartition ({tarif.tranches.length} tranches) :</p>
              <div className="space-y-0.5">
                {tarif.tranches.map((t: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>T{t.numero ?? i + 1} — {t.label ?? t.libelle ?? "Tranche"}</span>
                    <span className="tabular-nums font-medium">
                      {Number(t.montant ?? 0).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
