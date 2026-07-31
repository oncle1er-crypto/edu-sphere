import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveau, niveauOfCycle, NIVEAU_LABELS } from "@/context/NiveauContext";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";

export type CleRepartition = "effectif" | "recettes" | "egal";

/**
 * Quote-part des charges COMMUNES (dépenses sans niveau) imputée au niveau actif.
 *
 * En vue « Tous les niveaux » : ratio = 1 (aucune répartition, tout est compté
 * une seule fois — pas de double comptage possible).
 * En vue Primaire / Secondaire : ratio = part du niveau selon la clé de
 * répartition définie dans les paramètres financiers :
 *   - effectif : nombre d'élèves du niveau / effectif total
 *   - recettes : encaissements du niveau / encaissements totaux
 *   - egal     : 50 / 50
 *
 * Les ratios Primaire + Secondaire somment toujours à 1 : aucune charge
 * commune n'est perdue ni comptée deux fois.
 */
export function useQuotePartCommune() {
  const { ecoleId } = useEcoleId();
  const { activeAnnee } = useAcademicPeriod();
  const { isGlobal, niveau, effectifs, cycles } = useNiveau();
  const [cle, setCle] = useState<CleRepartition>("effectif");
  const [recettes, setRecettes] = useState<{ primaire: number; secondaire: number } | null>(null);

  // Clé de répartition (paramètres financiers)
  useEffect(() => {
    if (!ecoleId) return;
    let cancelled = false;
    supabase
      .from("finance_settings")
      .select("cle_repartition_commune")
      .eq("ecole_id", ecoleId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const v = (data as any)?.cle_repartition_commune;
        if (v === "effectif" || v === "recettes" || v === "egal") setCle(v);
      });
    return () => { cancelled = true; };
  }, [ecoleId]);

  // Recettes encaissées par niveau (uniquement si la clé le demande)
  useEffect(() => {
    if (cle !== "recettes" || !ecoleId || !activeAnnee) { setRecettes(null); return; }
    let cancelled = false;
    (async () => {
      const [{ data: cls }, { data: pays }] = await Promise.all([
        supabase.from("classes").select("id, cycle_id").eq("ecole_id", ecoleId).eq("annee_id", activeAnnee.id),
        supabase
          .from("paiements")
          .select("montant, eleve_id, eleves(classe_id)")
          .eq("ecole_id", ecoleId)
          .gte("date_paiement", activeAnnee.debut)
          .lte("date_paiement", activeAnnee.fin)
          .range(0, 9999),
      ]);
      if (cancelled) return;
      const cycleNiveau = new Map(cycles.map((c) => [c.id, niveauOfCycle(c)]));
      const classeNiveau = new Map(
        ((cls ?? []) as any[]).map((c) => [c.id, c.cycle_id ? cycleNiveau.get(c.cycle_id) ?? null : null]),
      );
      let primaire = 0;
      let secondaire = 0;
      for (const p of (pays ?? []) as any[]) {
        const n = p.eleves?.classe_id ? classeNiveau.get(p.eleves.classe_id) : null;
        const m = Number(p.montant) || 0;
        if (n === "primaire") primaire += m;
        else if (n === "secondaire") secondaire += m;
      }
      setRecettes({ primaire, secondaire });
    })();
    return () => { cancelled = true; };
  }, [cle, ecoleId, activeAnnee?.id, cycles]);

  const ratio = useMemo(() => {
    if (isGlobal) return 1;
    const n = niveau as "primaire" | "secondaire";
    if (cle === "egal") return 0.5;
    if (cle === "recettes" && recettes) {
      const total = recettes.primaire + recettes.secondaire;
      if (total > 0) return recettes[n] / total;
      // Pas de recettes : on retombe sur l'effectif pour ne rien perdre.
    }
    const total = effectifs.total;
    if (total <= 0) return 0.5;
    return effectifs[n] / total;
  }, [isGlobal, niveau, cle, recettes, effectifs]);

  const cleLabel = cle === "effectif" ? "effectif élèves" : cle === "recettes" ? "recettes encaissées" : "50 / 50";

  return {
    /** Coefficient à appliquer aux charges communes (1 en vue globale). */
    ratio,
    cle,
    cleLabel,
    isGlobal,
    /** Mention à afficher/imprimer sur les documents comptables. */
    mention: isGlobal
      ? "Périmètre : tous les niveaux (charges communes intégrales)"
      : `Périmètre : ${NIVEAU_LABELS[niveau]} — quote-part des charges communes ${(ratio * 100).toFixed(1)} % (clé : ${cleLabel})`,
  };
}
