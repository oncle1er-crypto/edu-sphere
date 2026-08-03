/**
 * Tri alphabétique français partagé pour toutes les listes d'élèves.
 * Instancié une seule fois au niveau du module (performance sur longues listes).
 */
const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

type NomPrenom = { nom?: string | null; prenom?: string | null };

const norm = (v?: string | null) => (typeof v === "string" ? v.trim() : "");

/** Comparateur alphabétique français : nom puis prénom, insensible aux accents et à la casse. */
export function compareEleves(a: NomPrenom, b: NomPrenom): number {
  const an = norm(a?.nom);
  const bn = norm(b?.nom);
  if (an && bn) {
    const c = collator.compare(an, bn);
    if (c !== 0) return c;
  } else if (an !== bn) {
    // Valeurs vides en fin de liste
    return an ? -1 : 1;
  }

  const ap = norm(a?.prenom);
  const bp = norm(b?.prenom);
  if (ap && bp) return collator.compare(ap, bp);
  if (ap === bp) return 0;
  return ap ? -1 : 1;
}

/** Retourne une nouvelle copie triée (ne mute jamais le tableau reçu). */
export function sortEleves<T extends NomPrenom>(rows: T[]): T[] {
  return [...(rows ?? [])].sort(compareEleves);
}

/** Variante pour des lignes où nom/prénom sont imbriqués ou dérivés. */
export function sortByEleve<T>(rows: T[], pick: (row: T) => NomPrenom): T[] {
  return [...(rows ?? [])].sort((a, b) => compareEleves(pick(a), pick(b)));
}
