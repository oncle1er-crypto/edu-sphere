/**
 * Nombre de mois d'anticipation avant le début officiel d'une année scolaire
 * pendant lesquels une activité financière (dépenses de préparation de
 * rentrée, inscriptions anticipées...) doit rester visible et rattachée à
 * l'année à venir, plutôt que de tomber dans l'angle mort entre deux années
 * scolaires (ex: dépenses estivales entre la clôture de l'année précédente
 * et le démarrage officiel de la suivante).
 *
 * Valeur de référence historique : useBilanComptable.ts appliquait déjà
 * cette anticipation pour construire ses colonnes mensuelles. Ce fichier
 * centralise la constante pour que tous les écrans qui filtrent des données
 * financières par "année active" restent cohérents entre eux.
 */
export const MOIS_ANTICIPATION_FINANCIERE = 2;

/** Premier jour du mois de début d'année, moins la fenêtre d'anticipation. */
export function debutAnticipe(debutAnneeIso: string): string {
  const d = new Date(debutAnneeIso);
  const start = new Date(d.getFullYear(), d.getMonth() - MOIS_ANTICIPATION_FINANCIERE, 1);
  return start.toISOString().slice(0, 10);
}

/**
 * Plage [from, to] à utiliser pour filtrer des données financières
 * (dépenses, paiements...) sur l'année scolaire active, en incluant la
 * fenêtre d'anticipation de rentrée. Retourne undefined tant qu'aucune
 * année n'est chargée (état de chargement) — les hooks appelants doivent
 * traiter undefined comme "ne pas filtrer / attendre".
 */
export function plageFinanciereAnnee(
  annee: { debut: string; fin: string } | null | undefined,
): { from: string; to: string } | undefined {
  if (!annee) return undefined;
  return { from: debutAnticipe(annee.debut), to: annee.fin };
}
