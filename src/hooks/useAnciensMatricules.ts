import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";

/**
 * Détermine, pour l'école de l'utilisateur, l'ensemble des matricules
 * d'élèves ayant déjà une fiche `eleves` dans une année scolaire dont la
 * date de début est strictement antérieure à `avantDate` (typiquement le
 * `debut` de l'année active).
 *
 * Sert à distinguer les élèves "anciens" (déjà présents une année
 * précédente, même matricule) des élèves "nouveaux" (aucune fiche
 * antérieure) — décision utilisateur du 11/08/2026 : `date_inscription`
 * n'est pas fiable comme marqueur de nouveauté (des imports en masse
 * peuvent lui donner la date de l'import plutôt qu'une date réelle
 * d'inscription). Cf. commentaire en tête de
 * src/lib/generateStudentRosterPDF.ts.
 *
 * Le matricule est utilisé comme clé d'identité inter-années : vérifié
 * fiable à 100% (227/227) sur le jeu de données réel de production, contre
 * 97% pour un rapprochement par (nom, prénom, date de naissance).
 */
export function useAnciensMatricules(avantDate: string | null | undefined) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [matriculesAnciens, setMatriculesAnciens] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (ecoleLoading) return;
    if (!ecoleId || !avantDate) {
      setMatriculesAnciens(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("eleves")
      .select("matricule, annees_scolaires(debut)")
      .eq("ecole_id", ecoleId)
      .not("matricule", "is", null)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          setMatriculesAnciens(new Set());
          setLoading(false);
          return;
        }
        const set = new Set<string>();
        for (const row of (data ?? []) as any[]) {
          const debut: string | undefined = row.annees_scolaires?.debut;
          if (row.matricule && debut && debut < avantDate) set.add(row.matricule);
        }
        setMatriculesAnciens(set);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ecoleId, ecoleLoading, avantDate]);

  return { matriculesAnciens, loading: loading || ecoleLoading };
}
