import { useCallback, useMemo } from "react";
import { useNiveau } from "@/context/NiveauContext";

/**
 * Helpers de filtrage par niveau (Primaire / Secondaire / Global).
 *
 * Deux stratégies :
 *  - `applyClasse` / `applyCycle` : filtre côté serveur via `.in()` quand la
 *    liste d'ids reste raisonnable (classes, cycles).
 *  - `keepEleve` / `keepClasse` : filtre côté client (les listes d'élèves
 *    peuvent dépasser la longueur d'URL acceptable pour `.in()`).
 */
export function useNiveauFilters() {
  const { isGlobal, cycleIds, classeIds, eleveIds, matchesCycle, niveau, label } = useNiveau();

  const classeIdSet = useMemo(() => (classeIds ? new Set(classeIds) : null), [classeIds]);
  const eleveIdSet = useMemo(() => (eleveIds ? new Set(eleveIds) : null), [eleveIds]);

  /** Filtre serveur sur une colonne `classe_id`. */
  const applyClasse = <Q extends { in: (c: string, v: string[]) => Q }>(q: Q, col = "classe_id"): Q =>
    isGlobal || !classeIds ? q : q.in(col, classeIds.length ? classeIds : ["00000000-0000-0000-0000-000000000000"]);

  /** Filtre serveur sur une colonne `cycle_id` (les lignes "Commun" sont exclues côté serveur : utiliser keepByCycle pour les conserver). */
  const applyCycle = <Q extends { in: (c: string, v: string[]) => Q }>(q: Q, col = "cycle_id"): Q =>
    isGlobal ? q : q.in(col, cycleIds.length ? cycleIds : ["00000000-0000-0000-0000-000000000000"]);

  const keepClasse = useCallback(
    (classeId: string | null | undefined) =>
      isGlobal || !classeIdSet ? true : !!classeId && classeIdSet.has(classeId),
    [isGlobal, classeIdSet],
  );

  const keepEleve = useCallback(
    (eleveId: string | null | undefined) =>
      isGlobal || !eleveIdSet ? true : !!eleveId && eleveIdSet.has(eleveId),
    [isGlobal, eleveIdSet],
  );

  return {
    niveau,
    label,
    isGlobal,
    cycleIds,
    classeIds,
    eleveIds,
    classeIdSet,
    eleveIdSet,
    applyClasse,
    applyCycle,
    keepClasse,
    keepEleve,
    matchesCycle,
  };
}
