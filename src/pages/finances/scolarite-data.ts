// Données réelles scolarité CSP — Complexe Scolaire La Providence (FCFA)
// Paiements en 3 échéances : Octobre, Novembre, Janvier

export type NiveauScolarite =
  | "Maternelle 1"
  | "Maternelle 2"
  | "Grande Section (Ancien)"
  | "Grande Section (Nouveau)"
  | "CP1-CP2"
  | "CE1-CE2"
  | "CM1-CM2"
  | "6ème-5ème"
  | "4ème";

export type TrancheStatut = "payee" | "partielle" | "due" | "retard";

export interface TrancheScolarite {
  num: 1 | 2 | 3;
  label: string;
  echeance: string;
  montant: number;
}

export interface TarifNiveau {
  niveau: NiveauScolarite;
  tranches: [number, number, number]; // OCT, NOV, JANVIER
  total: number;
}

// ─── Tarifs scolarité réels CSP ───
export const TARIFS_SCOLARITE: TarifNiveau[] = [
  { niveau: "Maternelle 1",              tranches: [85_000, 35_000, 30_000], total: 150_000 },
  { niveau: "Maternelle 2",              tranches: [80_000, 35_000, 20_000], total: 135_000 },
  { niveau: "Grande Section (Ancien)",   tranches: [50_000, 50_000, 40_000], total: 140_000 },
  { niveau: "Grande Section (Nouveau)",  tranches: [55_000, 55_000, 40_000], total: 150_000 },
  { niveau: "CP1-CP2",                   tranches: [80_000, 45_000, 30_000], total: 155_000 },
  { niveau: "CE1-CE2",                   tranches: [80_000, 45_000, 40_000], total: 165_000 },
  { niveau: "CM1-CM2",                   tranches: [80_000, 55_000, 40_000], total: 175_000 },
  { niveau: "6ème-5ème",                 tranches: [80_000, 55_000, 40_000], total: 175_000 },
  { niveau: "4ème",                      tranches: [80_000, 65_000, 40_000], total: 185_000 },
];

// ─── Tarifs Car & Cantine réels (par trimestre) ───
export interface TarifService {
  designation: string;
  tranches: [number, number, number]; // 1er TRIM, 2e TRIM, 3e TRIM
  total: number;
}

export const TARIFS_SERVICES: TarifService[] = [
  { designation: "Car (Transport)",          tranches: [30_000, 30_000, 20_000], total: 80_000 },
  { designation: "Cantine Primaire-Collège", tranches: [30_000, 30_000, 20_000], total: 80_000 },
  { designation: "Cantine Maternelle",       tranches: [21_000, 21_000, 14_000], total: 56_000 },
];

export const ECHEANCES_SCOLARITE = ["Octobre", "Novembre", "Janvier"];
export const ECHEANCES_SERVICES  = ["1er Trimestre", "2e Trimestre", "3e Trimestre"];

// ─── Types compatibles legacy ───
export type Cycle = "Maternelle" | "Primaire" | "Collège";
export type Tranche = {
  id?: string;
  num: 1 | 2 | 3;
  label: string;
  echeance: string;
  montant: number;
  paye: number;
  statut: TrancheStatut;
};

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
  joursRetard: number;
}

// Mapping classe → tarif
function tarifForClasse(classe: string): TarifNiveau {
  const cl = classe.toUpperCase();
  if (cl.includes("PS") || cl.includes("MATERNELLE 1")) return TARIFS_SCOLARITE[0];
  if (cl.includes("MS") || cl.includes("MATERNELLE 2")) return TARIFS_SCOLARITE[1];
  if (cl.includes("GS")) return TARIFS_SCOLARITE[3]; // Nouveau par défaut
  if (cl.includes("CP")) return TARIFS_SCOLARITE[4];
  if (cl.includes("CE")) return TARIFS_SCOLARITE[5];
  if (cl.includes("CM")) return TARIFS_SCOLARITE[6];
  if (cl.includes("6") || cl.includes("5")) return TARIFS_SCOLARITE[7];
  if (cl.includes("4")) return TARIFS_SCOLARITE[8];
  return TARIFS_SCOLARITE[4]; // fallback CP
}

function cycleForClasse(classe: string): Cycle {
  const cl = classe.toUpperCase();
  if (cl.includes("PS") || cl.includes("MS") || cl.includes("GS") || cl.includes("MATERNELLE")) return "Maternelle";
  if (cl.includes("6") || cl.includes("5") || cl.includes("4") || cl.includes("3")) return "Collège";
  return "Primaire";
}

const TRANCHE_LABELS = ["1ère tranche — Octobre", "2ème tranche — Novembre", "3ème tranche — Janvier"];
const TRANCHE_ECHEANCES = ["15/10/2025", "15/11/2025", "15/01/2026"];

function buildTranches(tarif: TarifNiveau, profil: "ajour" | "partiel" | "retard1" | "retard2" | "tout-du"): Tranche[] {
  const base: Tranche[] = tarif.tranches.map((montant, i) => ({
    num: (i + 1) as 1 | 2 | 3,
    label: TRANCHE_LABELS[i],
    echeance: TRANCHE_ECHEANCES[i],
    montant,
    paye: 0,
    statut: "due" as TrancheStatut,
  }));

  switch (profil) {
    case "ajour":
      base.forEach(t => { t.paye = t.montant; t.statut = "payee"; });
      break;
    case "partiel":
      base[0].paye = base[0].montant; base[0].statut = "payee";
      base[1].paye = base[1].montant; base[1].statut = "payee";
      base[2].paye = Math.round(base[2].montant * 0.5); base[2].statut = "partielle";
      break;
    case "retard1":
      base[0].paye = base[0].montant; base[0].statut = "payee";
      base[1].paye = base[1].montant; base[1].statut = "payee";
      base[2].paye = 0; base[2].statut = "retard";
      break;
    case "retard2":
      base[0].paye = base[0].montant; base[0].statut = "payee";
      base[1].paye = Math.round(base[1].montant * 0.3); base[1].statut = "partielle";
      base[2].paye = 0; base[2].statut = "retard";
      break;
    case "tout-du":
      base.forEach(t => { t.statut = "retard"; });
      break;
  }
  return base;
}

function makeEleve(
  id: string, mat: string, nom: string, prenom: string, classe: string,
  parent: string, tel: string, profil: "ajour" | "partiel" | "retard1" | "retard2" | "tout-du",
  retard = 0, derniereRelance?: string,
): EleveScolarite {
  const tarif = tarifForClasse(classe);
  const cycle = cycleForClasse(classe);
  const tranches = buildTranches(tarif, profil);
  const totalPaye = tranches.reduce((s, t) => s + t.paye, 0);
  return {
    id, matricule: mat, nom, prenom, classe, cycle, parent, telephone: tel,
    fraisAnnuel: tarif.total, totalPaye, resteDu: tarif.total - totalPaye,
    tranches, joursRetard: retard, derniereRelance,
  };
}

export const ELEVES_SCOLARITE: EleveScolarite[] = [
  makeEleve("1", "CSP-2025-0142", "KOUASSI", "Junior", "CE2 A", "M. Kouassi Pierre", "+225 07 11 22 33 44", "ajour"),
  makeEleve("2", "CSP-2025-0089", "KONÉ", "Sarah", "6e B", "Mme Koné Esther", "+225 05 88 77 66 55", "ajour"),
  makeEleve("3", "CSP-2025-0203", "COULIBALY", "Léa", "5e B", "M. Coulibaly Jean", "+225 07 44 55 66 77", "retard1", 11, "20/04/2026"),
  makeEleve("4", "CSP-2025-0317", "BAMBA", "Eric", "4e A", "Mme Bamba Aïcha", "+225 01 22 33 44 55", "retard2", 24, "15/04/2026"),
  makeEleve("5", "CSP-2025-0418", "DIALLO", "Carine", "CM1 A", "M. Diallo Paul", "+225 07 99 88 77 66", "partiel", 5),
  makeEleve("6", "CSP-2025-0512", "N'GUESSAN", "Joël", "4e B", "M. N'Guessan François", "+225 05 11 22 33 44", "tout-du", 38, "10/04/2026"),
  makeEleve("7", "CSP-2025-0099", "YAO", "Marie", "PS B", "Mme Yao Brigitte", "+225 07 22 33 44 55", "retard1", 8, "22/04/2026"),
  makeEleve("8", "CSP-2025-0145", "OUATTARA", "Paul", "CE1 A", "M. Ouattara Albert", "+225 01 55 66 77 88", "ajour"),
  makeEleve("9", "CSP-2025-0267", "TRAORÉ", "Yves", "4e A", "Mme Traoré Sylvie", "+225 05 33 44 55 66", "ajour"),
  makeEleve("10", "CSP-2025-0188", "AHOU", "Inès", "GS A", "M. Ahou René", "+225 07 66 77 88 99", "partiel", 3),
  makeEleve("11", "CSP-2025-0298", "TOURÉ", "Aboubacar", "5e A", "M. Touré Issouf", "+225 05 77 88 99 00", "retard2", 18, "18/04/2026"),
  makeEleve("12", "CSP-2025-0344", "KOFFI", "Aya", "CM2 A", "Mme Koffi Adjoua", "+225 07 88 99 00 11", "ajour"),
  makeEleve("13", "CSP-2025-0411", "DIABATÉ", "Mariam", "CP A", "M. Diabaté Yacouba", "+225 01 99 00 11 22", "retard1", 14, "12/04/2026"),
  makeEleve("14", "CSP-2025-0501", "GNAMBA", "Kouamé", "6e A", "Mme Gnamba Affoué", "+225 05 00 11 22 33", "partiel", 6),
  makeEleve("15", "CSP-2025-0078", "SÉRI", "Fatim", "MS A", "M. Séri Lassina", "+225 07 11 33 55 77", "ajour"),
];

// Frais par cycle (legacy compat — moyennes)
export const FRAIS_PAR_CYCLE: Record<Cycle, number> = {
  Maternelle: 145_000,
  Primaire: 165_000,
  Collège: 180_000,
};

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
  ajour: "bg-accent/15 text-primary border-accent/30",
  partiel: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  retard: "bg-destructive/15 text-destructive border-destructive/30",
};

export function fcfa(n: number): string {
  return n.toLocaleString("fr-FR");
}

export function getEcheancier() {
  const echeances = [
    { num: 1, label: "1ère tranche — Octobre", date: "15/10/2025" },
    { num: 2, label: "2ème tranche — Novembre", date: "15/11/2025" },
    { num: 3, label: "3ème tranche — Janvier", date: "15/01/2026" },
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
