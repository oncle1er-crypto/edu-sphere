// Données partagées scolarité — frais GSP par cycle (FCFA)
// Tranches MENA standard: T1 (rentrée), T2 (janvier), T3 (avril)

export type Cycle = "Maternelle" | "Primaire" | "Collège" | "Lycée";
export type TrancheStatut = "payee" | "partielle" | "due" | "retard";

export interface Tranche {
  num: 1 | 2 | 3;
  label: string;
  echeance: string; // DD/MM/YYYY
  montant: number;
  paye: number;
  statut: TrancheStatut;
}

export interface EleveScolarite {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  classe: string;
  cycle: Cycle;
  parent: string;
  telephone: string;
  fraisAnnuel: number;
  totalPaye: number;
  resteDu: number;
  tranches: Tranche[];
  derniereRelance?: string;
  joursRetard: number; // pire retard (0 si à jour)
}

// Frais annuels par cycle (inscription + scolarité)
export const FRAIS_PAR_CYCLE: Record<Cycle, number> = {
  Maternelle: 240_000,
  Primaire: 300_000,
  Collège: 420_000,
  Lycée: 540_000,
};

const TRANCHE_LABELS = ["1ère tranche — Rentrée", "2ème tranche — Janvier", "3ème tranche — Avril"];
const TRANCHE_ECHEANCES = ["15/09/2025", "15/01/2026", "15/04/2026"];

function buildTranches(frais: number, profil: "ajour" | "partiel" | "retard1" | "retard2" | "tout-du"): Tranche[] {
  const t1 = Math.round(frais * 0.4);
  const t2 = Math.round(frais * 0.3);
  const t3 = frais - t1 - t2;
  const base: Tranche[] = [
    { num: 1, label: TRANCHE_LABELS[0], echeance: TRANCHE_ECHEANCES[0], montant: t1, paye: 0, statut: "due" },
    { num: 2, label: TRANCHE_LABELS[1], echeance: TRANCHE_ECHEANCES[1], montant: t2, paye: 0, statut: "due" },
    { num: 3, label: TRANCHE_LABELS[2], echeance: TRANCHE_ECHEANCES[2], montant: t3, paye: 0, statut: "due" },
  ];
  switch (profil) {
    case "ajour":
      base[0].paye = t1; base[0].statut = "payee";
      base[1].paye = t2; base[1].statut = "payee";
      base[2].paye = t3; base[2].statut = "payee";
      break;
    case "partiel":
      base[0].paye = t1; base[0].statut = "payee";
      base[1].paye = t2; base[1].statut = "payee";
      base[2].paye = Math.round(t3 * 0.5); base[2].statut = "partielle";
      break;
    case "retard1":
      base[0].paye = t1; base[0].statut = "payee";
      base[1].paye = t2; base[1].statut = "payee";
      base[2].paye = 0; base[2].statut = "retard";
      break;
    case "retard2":
      base[0].paye = t1; base[0].statut = "payee";
      base[1].paye = Math.round(t2 * 0.3); base[1].statut = "partielle";
      base[2].paye = 0; base[2].statut = "retard";
      break;
    case "tout-du":
      base[0].paye = 0; base[0].statut = "retard";
      base[1].paye = 0; base[1].statut = "retard";
      base[2].paye = 0; base[2].statut = "retard";
      break;
  }
  return base;
}

function makeEleve(
  id: string, mat: string, nom: string, prenom: string, classe: string, cycle: Cycle,
  parent: string, tel: string, profil: "ajour" | "partiel" | "retard1" | "retard2" | "tout-du",
  retard = 0, derniereRelance?: string,
): EleveScolarite {
  const fraisAnnuel = FRAIS_PAR_CYCLE[cycle];
  const tranches = buildTranches(fraisAnnuel, profil);
  const totalPaye = tranches.reduce((s, t) => s + t.paye, 0);
  return {
    id, matricule: mat, nom, prenom, classe, cycle, parent, telephone: tel,
    fraisAnnuel, totalPaye, resteDu: fraisAnnuel - totalPaye,
    tranches, joursRetard: retard, derniereRelance,
  };
}

export const ELEVES_SCOLARITE: EleveScolarite[] = [
  makeEleve("1", "GSP-2025-0142", "MBALLA", "Junior", "CE2 A", "Primaire", "M. Mballa Pierre", "+225 07 11 22 33 44", "ajour"),
  makeEleve("2", "GSP-2025-0089", "NGUEMO", "Sarah", "6e B", "Collège", "Mme Nguemo Esther", "+225 05 88 77 66 55", "ajour"),
  makeEleve("3", "GSP-2025-0203", "ATANGANA", "Léa", "5e B", "Collège", "M. Atangana Jean", "+225 07 44 55 66 77", "retard1", 11, "20/04/2026"),
  makeEleve("4", "GSP-2025-0317", "MBARGA", "Eric", "Tle C", "Lycée", "Mme Mbarga Aïcha", "+225 01 22 33 44 55", "retard2", 24, "15/04/2026"),
  makeEleve("5", "GSP-2025-0418", "NGONO", "Carine", "CM1 A", "Primaire", "M. Ngono Paul", "+225 07 99 88 77 66", "partiel", 5),
  makeEleve("6", "GSP-2025-0512", "EKWALLA", "Joël", "1ère D", "Lycée", "M. Ekwalla François", "+225 05 11 22 33 44", "tout-du", 38, "10/04/2026"),
  makeEleve("7", "GSP-2025-0099", "ONDOA", "Marie", "PS B", "Maternelle", "Mme Ondoa Brigitte", "+225 07 22 33 44 55", "retard1", 8, "22/04/2026"),
  makeEleve("8", "GSP-2025-0145", "TCHOUMI", "Paul", "CE1 A", "Primaire", "M. Tchoumi Albert", "+225 01 55 66 77 88", "ajour"),
  makeEleve("9", "GSP-2025-0267", "KAMGA", "Yves", "4e A", "Collège", "Mme Kamga Sylvie", "+225 05 33 44 55 66", "ajour"),
  makeEleve("10", "GSP-2025-0188", "FOPA", "Inès", "GS A", "Maternelle", "M. Fopa René", "+225 07 66 77 88 99", "partiel", 3),
  makeEleve("11", "GSP-2025-0298", "BAMBA", "Aboubacar", "3e B", "Collège", "M. Bamba Issouf", "+225 05 77 88 99 00", "retard2", 18, "18/04/2026"),
  makeEleve("12", "GSP-2025-0344", "KOFFI", "Aya", "Tle A", "Lycée", "Mme Koffi Adjoua", "+225 07 88 99 00 11", "ajour"),
  makeEleve("13", "GSP-2025-0411", "DIABATÉ", "Mariam", "CP A", "Primaire", "M. Diabaté Yacouba", "+225 01 99 00 11 22", "retard1", 14, "12/04/2026"),
  makeEleve("14", "GSP-2025-0501", "YAO", "Kouamé", "2nde C", "Lycée", "Mme Yao Affoué", "+225 05 00 11 22 33", "partiel", 6),
  makeEleve("15", "GSP-2025-0078", "OUATTARA", "Fatim", "MS A", "Maternelle", "M. Ouattara Lassina", "+225 07 11 33 55 77", "ajour"),
];

export function statutEleve(e: EleveScolarite): "ajour" | "partiel" | "retard" {
  if (e.resteDu === 0) return "ajour";
  if (e.tranches.some((t) => t.statut === "retard")) return "retard";
  return "partiel";
}

export const STATUT_LABEL: Record<"ajour" | "partiel" | "retard", string> = {
  ajour: "À jour",
  partiel: "Partiel",
  retard: "En retard",
};

export const STATUT_CLASS: Record<"ajour" | "partiel" | "retard", string> = {
  ajour: "bg-accent/15 text-accent border-accent/30",
  partiel: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  retard: "bg-destructive/15 text-destructive border-destructive/30",
};

export function fcfa(n: number): string {
  return n.toLocaleString("fr-FR");
}

// Échéancier consolidé : montant attendu vs encaissé par tranche
export function getEcheancier() {
  const echeances = [
    { num: 1, label: "1ère tranche", date: "15/09/2025" },
    { num: 2, label: "2ème tranche", date: "15/01/2026" },
    { num: 3, label: "3ème tranche", date: "15/04/2026" },
  ];
  return echeances.map((e) => {
    const tranches = ELEVES_SCOLARITE.map((el) => el.tranches.find((t) => t.num === e.num)!);
    const attendu = tranches.reduce((s, t) => s + t.montant, 0);
    const paye = tranches.reduce((s, t) => s + t.paye, 0);
    const enRetard = tranches.filter((t) => t.statut === "retard").length;
    const partielle = tranches.filter((t) => t.statut === "partielle").length;
    return { ...e, attendu, paye, reste: attendu - paye, enRetard, partielle, taux: Math.round((paye / attendu) * 100) };
  });
}
