/**
 * Statuts d'élèves — règle métier commune.
 *
 * - STATUTS_ACTIFS : élèves réellement dans l'école (comptés dans les
 *   effectifs, statistiques, listes, finances/créances).
 * - STATUTS_PAYANTS : élèves ayant déjà effectué au moins un versement
 *   (bascule automatique via `check_and_promote_eleve`). Seuls ces
 *   élèves ont droit aux cartes scolaires, bulletins, attestations,
 *   abonnements cantine/transport, prêts bibliothèque.
 */
export const STATUTS_ACTIFS = ["inscrit", "pre_inscrit", "actif"] as const;
export const STATUTS_PAYANTS = ["inscrit", "actif"] as const;

export type StatutEleve = (typeof STATUTS_ACTIFS)[number] | string;

export const isStatutActif = (s?: string | null) =>
  !!s && (STATUTS_ACTIFS as readonly string[]).includes(s);

export const isStatutPayant = (s?: string | null) =>
  !!s && (STATUTS_PAYANTS as readonly string[]).includes(s);
