/**
 * Avis de retard de paiement — logique pure (aucun accès réseau ici).
 *
 * Règle de retard réutilisée telle quelle depuis le reste de l'application,
 * sans réinvention :
 *  - Scolarité : `tranches.statut === "retard"` (calculé par le trigger SQL
 *    `reconcilier_tranche_paiements`, déjà utilisé par la page Impayés et la
 *    fiche élève). Une tranche couverte par une remise/bourse/prise en charge
 *    est déjà comptée "payée" en amont — rien à recalculer ici.
 *  - Cantine / Transport : une facture (`factures.categorie`) est en retard
 *    si `statut <> 'annulee'`, `montant_paye < montant` ET `date_echeance`
 *    strictement dans le passé — même définition que `ServiceBilling.estEnRetard()`
 *    et `computeServiceKpis()`. Une échéance du jour même n'est PAS un retard
 *    (cohérent avec `mapTrancheStatut` côté scolarité : `today > echeance`).
 *
 * Point de vigilance connu (non corrigé ici, cf. rapport) : l'application ne
 * dispense pas aujourd'hui un élève inscrit en cours d'année des tranches déjà
 * échues au moment de son inscription (`generer_tranches_eleve` ne compare pas
 * `date_inscription` à `echeance`). Cette fonctionnalité hérite donc du même
 * comportement que la page Impayés existante — ce n'est pas une régression
 * introduite ici, et ce n'est pas corrigé pour ne pas modifier une règle
 * métier financière existante sans validation explicite.
 */

export type CategorieAvis = "scolarite" | "cantine" | "transport";

export const CATEGORIES_AVIS: CategorieAvis[] = ["scolarite", "cantine", "transport"];

export const CATEGORIE_LABEL_LONG: Record<CategorieAvis, string> = {
  scolarite: "la scolarité",
  cantine: "la cantine",
  transport: "le transport",
};

export const CATEGORIE_LABEL_COURT: Record<CategorieAvis, string> = {
  scolarite: "Scolarité",
  cantine: "Cantine",
  transport: "Transport",
};

export interface CategorieRetardDetail {
  /** Reste dû cumulé sur cette catégorie (FCFA). */
  montantDu: number;
  /** Échéance la plus ancienne parmi les éléments en retard de cette catégorie (YYYY-MM-DD). */
  echeance: string;
}

export interface EleveAvisData {
  eleveId: string;
  matricule: string;
  nom: string;
  prenom: string;
  classe: string;
  /** Catégories pour lesquelles l'élève a des éléments facturables dans le périmètre choisi (retard ou non). */
  concerne: Partial<Record<CategorieAvis, true>>;
  /** Détail des catégories réellement en retard. */
  retards: Partial<Record<CategorieAvis, CategorieRetardDetail>>;
}

export type StatutAvis = "retard" | "ajour" | "non_concerne";

/** Statut d'un élève au regard des seules catégories actuellement cochées par l'utilisateur. */
export function statutAvisEleve(row: EleveAvisData, categoriesActives: CategorieAvis[]): StatutAvis {
  const concerneParUneCategorieActive = categoriesActives.some((c) => row.concerne[c]);
  if (!concerneParUneCategorieActive) return "non_concerne";
  const enRetard = categoriesActives.some((c) => row.retards[c]);
  return enRetard ? "retard" : "ajour";
}

/** Catégories réellement en retard parmi les catégories actives (ordre stable Scolarité/Cantine/Transport). */
export function categoriesEnRetard(row: EleveAvisData, categoriesActives: CategorieAvis[]): CategorieAvis[] {
  return CATEGORIES_AVIS.filter((c) => categoriesActives.includes(c) && row.retards[c]);
}

export function totalDu(row: EleveAvisData, categoriesActives: CategorieAvis[]): number {
  return categoriesEnRetard(row, categoriesActives).reduce((s, c) => s + (row.retards[c]?.montantDu ?? 0), 0);
}

export function fcfa(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

export function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function joinFrench(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

export interface AvisTextOptions {
  includeMontant: boolean;
  includeEcheance: boolean;
}

/**
 * Phrase française listant les catégories en retard, ex. "la scolarité, la
 * cantine et le transport". Exportée séparément de `buildAvisText` pour être
 * réutilisée telle quelle par le rendu "gras" de `LateNoticeCard.tsx`
 * (affichage plein format, cf. changement du 2026-09-07) sans dupliquer la
 * logique de jointure française.
 */
export function categoriesPhrase(row: EleveAvisData, categoriesActives: CategorieAvis[]): string {
  return joinFrench(categoriesEnRetard(row, categoriesActives).map((c) => CATEGORIE_LABEL_LONG[c]));
}

/** Échéance la plus ancienne (YYYY-MM-DD) parmi les catégories en retard, ou `null` si aucune. */
export function earliestEcheance(row: EleveAvisData, categoriesActives: CategorieAvis[]): string | null {
  const enRetard = categoriesEnRetard(row, categoriesActives);
  if (enRetard.length === 0) return null;
  return enRetard.map((c) => row.retards[c]!.echeance).sort()[0];
}

/**
 * Génère le texte par défaut de l'avis (2 paragraphes), adapté aux catégories
 * réellement en retard de cet élève. Le montant/l'échéance, s'ils sont
 * activés, sont ajoutés en bloc distinct après le corps du message (comme
 * dans le modèle fourni), pas mélangés dans les 2 paragraphes.
 */
export function buildAvisText(row: EleveAvisData, categoriesActives: CategorieAvis[], opts: AvisTextOptions): string {
  const enRetard = categoriesEnRetard(row, categoriesActives);
  const phrase = categoriesPhrase(row, categoriesActives);
  const nomComplet = `${row.prenom} ${row.nom}`.trim();

  let texte =
    `Madame, Monsieur, nous vous informons que la situation de paiement de votre enfant ${nomComplet}, ` +
    `en classe de ${row.classe}, présente un retard concernant : ${phrase}.\n\n` +
    `Nous vous prions de bien vouloir vous rapprocher de l'administration afin de régulariser la situation ` +
    `dans les meilleurs délais. Merci de votre compréhension et de votre collaboration.`;

  if (opts.includeMontant && enRetard.length > 0) {
    const lignes = enRetard.map((c) => `${CATEGORIE_LABEL_COURT[c]} : ${fcfa(row.retards[c]!.montantDu)} F CFA`);
    texte += `\n\n${lignes.join("\n")}`;
    if (enRetard.length > 1) {
      texte += `\nTotal restant : ${fcfa(totalDu(row, categoriesActives))} F CFA`;
    }
  }

  if (opts.includeEcheance) {
    const plusAncienne = earliestEcheance(row, categoriesActives);
    if (plusAncienne) {
      texte += `\n\nÉchéance dépassée depuis le ${formatDateFr(plusAncienne)}.`;
    }
  }

  return texte;
}
