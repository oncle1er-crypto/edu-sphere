/**
 * Contrôles de cohérence de la ventilation de la scolarité.
 *
 * Objectif : empêcher toute configuration ou ventilation incohérente
 * (montants négatifs, non entiers, dépassement du total dû, soldes négatifs).
 */

import { ventilerScolarite, type VentilationParams, type Ventilation } from "./ventilationScolarite";

export type ValidationLevel = "error" | "warning";

export interface ValidationIssue {
  /** Champ concerné (clé du formulaire) ou "global" */
  field: string;
  level: ValidationLevel;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** true si aucune erreur bloquante */
  ok: boolean;
  /** Erreurs indexées par champ, pour l'affichage inline */
  byField: Record<string, string | undefined>;
}

const MAX_MONTANT = 5_000_000; // garde-fou : 5 M FCFA par poste

const LABELS: Record<string, string> = {
  frais_inscription: "Frais d'inscription / réinscription",
  frais_uniformes: "Frais d'uniformes & fournitures",
  frais_activites: "Frais d'activités extrascolaires",
};

function buildResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const byField: Record<string, string | undefined> = {};
  for (const e of errors) if (!byField[e.field]) byField[e.field] = e.message;
  return { issues, errors, warnings, ok: errors.length === 0, byField };
}

/**
 * Valide les paramètres de composition de la scolarité.
 * @param values montants saisis (peuvent être des chaînes issues d'inputs)
 * @param opts.totalMinScolarite plus petit total annuel de la grille tarifaire (si connu)
 */
export function validateVentilationParams(
  values: Record<string, unknown>,
  opts: { totalMinScolarite?: number | null; totalMinLabel?: string } = {},
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const nums: Record<string, number> = {};
  for (const field of Object.keys(LABELS)) {
    const raw = values[field];
    const n = typeof raw === "string" ? Number(raw.replace(/\s/g, "")) : Number(raw);
    const label = LABELS[field];

    if (raw === "" || raw === null || raw === undefined) {
      issues.push({ field, level: "error", message: `${label} : montant obligatoire.` });
      nums[field] = 0;
      continue;
    }
    if (!Number.isFinite(n)) {
      issues.push({ field, level: "error", message: `${label} : valeur numérique invalide.` });
      nums[field] = 0;
      continue;
    }
    if (n < 0) {
      issues.push({ field, level: "error", message: `${label} : le montant ne peut pas être négatif.` });
    }
    if (!Number.isInteger(n)) {
      issues.push({ field, level: "error", message: `${label} : saisir un montant entier (sans décimale).` });
    }
    if (n > MAX_MONTANT) {
      issues.push({
        field,
        level: "error",
        message: `${label} : montant trop élevé (max ${MAX_MONTANT.toLocaleString("fr-FR")} FCFA).`,
      });
    }
    nums[field] = n;
  }

  const inscription = nums.frais_inscription ?? 0;
  const annexes = (nums.frais_uniformes ?? 0) + (nums.frais_activites ?? 0);
  const socle = inscription + annexes;

  const totalMin = opts.totalMinScolarite ?? null;
  if (totalMin != null && Number.isFinite(totalMin) && totalMin > 0) {
    if (socle > totalMin) {
      issues.push({
        field: "global",
        level: "error",
        message:
          `Incohérence : inscription (${inscription.toLocaleString("fr-FR")} F) + frais annexes (${annexes.toLocaleString("fr-FR")} F) = ` +
          `${socle.toLocaleString("fr-FR")} F, ce qui dépasse le plus petit total annuel de la grille tarifaire ` +
          `(${totalMin.toLocaleString("fr-FR")} F${opts.totalMinLabel ? ` — ${opts.totalMinLabel}` : ""}). ` +
          `Les frais de scolarité deviendraient négatifs.`,
      });
    } else if (socle === totalMin) {
      issues.push({
        field: "global",
        level: "warning",
        message: `Attention : pour le tarif le plus bas (${totalMin.toLocaleString("fr-FR")} F), les frais de scolarité seraient nuls.`,
      });
    } else if (totalMin - socle < 0.1 * totalMin) {
      issues.push({
        field: "global",
        level: "warning",
        message: `Attention : il ne reste que ${(totalMin - socle).toLocaleString("fr-FR")} F de frais de scolarité pour le tarif le plus bas.`,
      });
    }
  }

  if (socle === 0) {
    issues.push({
      field: "global",
      level: "warning",
      message: "Aucun frais d'inscription ni frais annexes : la totalité sera imputée aux frais de scolarité.",
    });
  }

  return buildResult(issues);
}

/**
 * Vérifie la cohérence d'une ventilation calculée pour un élève.
 * Détecte soldes négatifs, dépassements et écarts d'arrondi.
 */
export function validateVentilation(
  totalDu: number,
  montantCouvert: number,
  params: VentilationParams,
): { ok: boolean; issues: ValidationIssue[]; ventilation: Ventilation; surplus: number } {
  const issues: ValidationIssue[] = [];
  const total = Number(totalDu) || 0;
  const couvert = Number(montantCouvert) || 0;

  if (total < 0) {
    issues.push({ field: "total", level: "error", message: "Total dû négatif : vérifier la grille tarifaire de l'élève." });
  }
  if (couvert < 0) {
    issues.push({ field: "couvert", level: "error", message: "Montant encaissé négatif : vérifier les versements et remises." });
  }

  const socle =
    (Number(params.fraisInscription) || 0) +
    (Number(params.fraisUniformes) || 0) +
    (Number(params.fraisActivites) || 0);
  if (total > 0 && socle > total) {
    issues.push({
      field: "params",
      level: "error",
      message: `Paramètres incohérents : inscription + annexes (${socle.toLocaleString("fr-FR")} F) dépassent le total dû (${total.toLocaleString("fr-FR")} F).`,
    });
  }

  const surplus = Math.max(0, couvert - Math.max(0, total));
  if (surplus > 0) {
    issues.push({
      field: "couvert",
      level: "warning",
      message: `Trop-perçu de ${surplus.toLocaleString("fr-FR")} F : le montant encaissé dépasse le total dû, l'excédent n'est pas ventilé.`,
    });
  }

  const ventilation = ventilerScolarite(total, couvert, params);

  for (const p of ventilation.postes) {
    if (p.du < 0 || p.affecte < 0 || p.reste < 0) {
      issues.push({ field: p.cle, level: "error", message: `${p.label} : solde négatif détecté.` });
    }
    if (p.affecte > p.du + 0.5) {
      issues.push({ field: p.cle, level: "error", message: `${p.label} : montant affecté supérieur au montant dû.` });
    }
  }
  if (ventilation.totalAffecte > ventilation.totalDu + 0.5) {
    issues.push({ field: "global", level: "error", message: "Total ventilé supérieur au total dû." });
  }

  return { ok: issues.every((i) => i.level !== "error"), issues, ventilation, surplus };
}
