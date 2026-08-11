/**
 * Construction de « buckets » (tranches temporelles) génériques pour les
 * écrans de récapitulatif financier qui doivent pouvoir se découper au jour,
 * à la semaine ou au mois — contrairement à `useBilanComptable.ts` qui ne
 * connaît que le découpage mensuel de l'exercice scolaire.
 *
 * Toutes les fonctions sont pures (aucun accès réseau) et opèrent sur des
 * chaînes ISO "YYYY-MM-DD". Les bornes `from`/`to` de chaque bucket sont
 * inclusives.
 */

export interface DateBucket {
  /** Identifiant stable et trié (ex. "2026-03-10", "2026-W11", "2026-03") */
  key: string;
  /** Libellé lisible pour affichage/export (ex. "10/03/2026", "Sem. du 09/03") */
  label: string;
  /** Première journée du bucket (incluse), format YYYY-MM-DD */
  from: string;
  /** Dernière journée du bucket (incluse), format YYYY-MM-DD */
  to: string;
}

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const toIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const fmtJour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

/** Lundi de la semaine ISO contenant `d`. */
function lundiDe(d: Date): Date {
  const jour = d.getDay(); // 0=dimanche
  const decalage = jour === 0 ? -6 : 1 - jour;
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate() + decalage);
  return l;
}

/** Numéro de semaine ISO-8601 de `d`. */
function semaineISO(d: Date): { annee: number; semaine: number } {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Jeudi de la semaine courante détermine l'année ISO
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const debutAnnee = new Date(date.getFullYear(), 0, 4);
  const semaine =
    1 + Math.round(((date.getTime() - debutAnnee.getTime()) / 86400000 - 3 + ((debutAnnee.getDay() + 6) % 7)) / 7);
  return { annee: date.getFullYear(), semaine };
}

/** Un bucket par jour calendaire, de `from` à `to` inclus. */
export function buildJourBuckets(from: string, to: string): DateBucket[] {
  const out: DateBucket[] = [];
  let cur = fromIso(from);
  const fin = fromIso(to);
  while (cur.getTime() <= fin.getTime()) {
    const iso = toIso(cur);
    out.push({ key: iso, label: fmtJour(cur), from: iso, to: iso });
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return out;
}

/** Un bucket par semaine ISO (lundi→dimanche) recoupant l'intervalle [from, to]. */
export function buildSemaineBuckets(from: string, to: string): DateBucket[] {
  const out: DateBucket[] = [];
  let cur = lundiDe(fromIso(from));
  const fin = fromIso(to);
  while (cur.getTime() <= fin.getTime()) {
    const dimanche = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 6);
    const { annee, semaine } = semaineISO(cur);
    out.push({
      key: `${annee}-W${String(semaine).padStart(2, "0")}`,
      label: `Sem. du ${fmtJour(cur)} au ${fmtJour(dimanche)}`,
      from: toIso(cur),
      to: toIso(dimanche),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
  }
  return out;
}

/** Un bucket par mois calendaire recoupant l'intervalle [from, to]. */
export function buildMoisBuckets(from: string, to: string): DateBucket[] {
  const out: DateBucket[] = [];
  const d0 = fromIso(from);
  const dF = fromIso(to);
  let cur = new Date(d0.getFullYear(), d0.getMonth(), 1);
  const fin = new Date(dF.getFullYear(), dF.getMonth(), 1);
  while (cur.getTime() <= fin.getTime()) {
    const dernierJour = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    out.push({
      key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      label: `${MOIS_LABELS[cur.getMonth()]} ${cur.getFullYear()}`,
      from: toIso(cur),
      to: toIso(dernierJour),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return out;
}

/**
 * Regroupe une liste de buckets mensuels continus en 3 blocs consécutifs
 * (« trimestres ») de taille égale — même règle de découpage que
 * `useBilanComptable.ts` (`taille = Math.ceil(nbMois / 3)`), pour que la
 * notion de « trimestre » reste identique dans tout le module Finances.
 */
export function buildTrimestreBuckets(moisBuckets: DateBucket[]): DateBucket[] {
  const n = moisBuckets.length;
  if (n === 0) return [];
  const taille = Math.ceil(n / 3);
  const out: DateBucket[] = [];
  for (let t = 0; t < 3; t++) {
    const f = t * taille;
    if (f >= n) break;
    const l = Math.min(n - 1, f + taille - 1);
    out.push({
      key: `T${t + 1}`,
      label: `Trimestre ${t + 1} (${moisBuckets[f].label} – ${moisBuckets[l].label})`,
      from: moisBuckets[f].from,
      to: moisBuckets[l].to,
    });
  }
  return out;
}

/** Restreint une liste de buckets triés à ceux qui recoupent [from, to]. */
export function clipBuckets(buckets: DateBucket[], from: string, to: string): DateBucket[] {
  return buckets.filter((b) => b.to >= from && b.from <= to);
}
