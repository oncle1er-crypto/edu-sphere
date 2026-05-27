// Helpers de calcul et d'appréciation pour les bulletins trimestriels.

export function fmt2(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toFixed(2).replace(".", ",");
}

/** Appréciation d'une matière selon la moyenne /20. */
export function appreciationMatiere(note: number | null): string {
  if (note === null || note === undefined || Number.isNaN(note)) return "-";
  if (note < 5) return "Très insuffisant";
  if (note < 8) return "Insuffisant";
  if (note < 10) return "Faible";
  if (note < 12) return "Passable";
  if (note < 14) return "Assez bien";
  if (note < 16) return "Bien";
  if (note < 18) return "Très bien";
  return "Excellent";
}

/** Appréciation générale du conseil. */
export function appreciationGenerale(moy: number | null): string {
  if (moy === null || moy === undefined || Number.isNaN(moy)) return "-";
  if (moy < 8) return "Travail très insuffisant";
  if (moy < 10) return "Doit fournir plus d'efforts";
  if (moy < 12) return "Travail passable";
  if (moy < 14) return "Assez bon travail";
  if (moy < 16) return "Bon travail";
  if (moy < 18) return "Très bon travail";
  return "Excellent travail";
}

/** Mention principale (Tableau d'honneur / Encouragements / Félicitations…). */
export function mentionPrincipale(moy: number | null): string {
  if (moy === null || moy === undefined || Number.isNaN(moy)) return "-";
  if (moy >= 16) return "Félicitations";
  if (moy >= 14) return "Encouragements";
  if (moy >= 12) return "Tableau d'honneur";
  if (moy >= 10) return "Résultat satisfaisant";
  return "Doit redoubler d'efforts";
}

/** Décision automatique simple (modifiable manuellement). */
export function decisionAuto(moy: number | null): string {
  if (moy === null || moy === undefined || Number.isNaN(moy)) return "À examiner";
  if (moy >= 10) return "Admis(e)";
  return "Doit redoubler d'efforts";
}

/** Catégorie standardisée d'une matière pour les blocs BILAN. */
export function categorieBulletin(cat: string | null | undefined, nom: string): "LETTRES" | "SCIENCES" | "AUTRES" {
  const c = (cat ?? "").toLowerCase();
  const n = nom.toLowerCase();
  if (
    c.includes("lettre") || c.includes("langue") || c.includes("litt") ||
    /(fran[cç]ais|philosoph|anglais|allemand|espagnol|histoire|g[eé]ographie|litt)/.test(n)
  ) return "LETTRES";
  if (
    c.includes("scien") || c.includes("math") ||
    /(math|physique|chimie|svt|biologie|sciences|informatique|techno)/.test(n)
  ) return "SCIENCES";
  return "AUTRES";
}
