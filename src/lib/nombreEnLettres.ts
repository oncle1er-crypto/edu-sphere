/**
 * Conversion d'un entier en toutes lettres françaises — utilisé pour faire
 * apparaître un montant en toutes lettres sur un document formel (ex. fiche
 * de paiement à signer), en complément du montant en chiffres.
 *
 * Règle de pluriel retenue pour "cent" et "quatre-vingt(s)" : ils prennent
 * un 's' uniquement lorsqu'ils sont un multiplicateur exact (rien après eux
 * dans leur propre groupe de 3 chiffres) ET que ce groupe est le groupe des
 * unités (0-999) — donc pas suivi de "mille"/"million"/"milliard". C'est la
 * convention retenue par la plupart des générateurs "montant en lettres"
 * administratifs : "quatre-vingts" (80) mais "quatre-vingt mille" (80 000),
 * "deux cents" (200) mais "deux cent mille" (200 000).
 */

const UNITES_0_19 = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];

// Index 0-1 inutilisés (pas de dizaine "zéro"/"dix" ici, dix-neuf est couvert ci-dessus).
const DIZAINES: Record<number, string> = {
  2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante",
};

function convertirDizaines(n: number, dernierGroupe: boolean): string {
  // n : 0-99
  if (n < 20) return UNITES_0_19[n];
  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  if (dizaine >= 2 && dizaine <= 6) {
    const mot = DIZAINES[dizaine];
    if (unite === 0) return mot;
    if (unite === 1) return `${mot} et un`;
    return `${mot}-${UNITES_0_19[unite]}`;
  }
  if (dizaine === 7) {
    // 70-79 = soixante + (dix..dix-neuf)
    if (unite === 1) return "soixante et onze";
    return "soixante-" + UNITES_0_19[10 + unite];
  }
  if (dizaine === 8) {
    if (unite === 0) return dernierGroupe ? "quatre-vingts" : "quatre-vingt";
    return "quatre-vingt-" + UNITES_0_19[unite];
  }
  // dizaine === 9 : 90-99 = quatre-vingt + (dix..dix-neuf)
  return "quatre-vingt-" + UNITES_0_19[10 + unite];
}

function convertirCentaines(n: number, dernierGroupe: boolean): string {
  // n : 0-999
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  let s = "";
  if (centaines > 0) {
    s = centaines === 1 ? "cent" : `${UNITES_0_19[centaines]} cent`;
    if (reste === 0 && centaines > 1 && dernierGroupe) s += "s";
  }
  if (reste > 0) {
    if (s) s += " ";
    s += convertirDizaines(reste, dernierGroupe);
  }
  return s;
}

/** Convertit un entier positif (ou négatif) en toutes lettres françaises. */
export function nombreEnLettres(valeur: number): string {
  const entier = Math.trunc(Math.abs(valeur));
  if (entier === 0) return "zéro";
  if (valeur < 0) return "moins " + nombreEnLettres(entier);

  const milliards = Math.floor(entier / 1_000_000_000);
  const millions = Math.floor((entier % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((entier % 1_000_000) / 1_000);
  const unites = entier % 1_000;

  const parts: string[] = [];
  if (milliards > 0) parts.push(milliards === 1 ? "un milliard" : `${convertirCentaines(milliards, false)} milliards`);
  if (millions > 0) parts.push(millions === 1 ? "un million" : `${convertirCentaines(millions, false)} millions`);
  if (milliers > 0) parts.push(milliers === 1 ? "mille" : `${convertirCentaines(milliers, false)} mille`);
  if (unites > 0) parts.push(convertirCentaines(unites, true));

  return parts.join(" ").trim();
}

/** Formate un montant FCFA en toutes lettres, capitalisé, ex. "Cinquante mille francs CFA". */
export function montantEnLettresFCFA(montant: number): string {
  const entier = Math.round(montant);
  const lettres = nombreEnLettres(entier);
  const mot = Math.abs(entier) > 1 ? "francs" : "franc";
  const phrase = `${lettres} ${mot} CFA`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
