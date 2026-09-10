/**
 * Paiement scindé : un même encaissement réglé avec deux moyens de paiement
 * (ex. une partie en espèces, le reste sur Wave).
 * Les parts sont toujours au maximum au nombre de deux.
 */

export interface MoyenPaiement {
  label: string;
  value: string;
}

export const MOYENS_PAIEMENT: MoyenPaiement[] = [
  { label: "Espèces", value: "especes" },
  { label: "Wave", value: "wave" },
  { label: "Orange Money", value: "orange_money" },
  { label: "MTN MoMo", value: "mtn_money" },
  { label: "Moov Money", value: "moov_money" },
  { label: "Virement", value: "virement" },
  { label: "Chèque", value: "cheque" },
];

export function labelMoyen(value: string | null | undefined): string {
  if (!value) return "—";
  if (value === "mixte") return "Mixte";
  return MOYENS_PAIEMENT.find((m) => m.value === value)?.label ?? value;
}

/** Second moyen de paiement saisi par la caisse. */
export interface PaymentSplit {
  mode: string;
  /** Montant réglé avec ce second moyen. */
  montant: number;
}

export interface PaymentPart {
  mode: string;
  montant: number;
}

/**
 * Décompose un encaissement en parts réellement à enregistrer.
 * Sans second moyen : une seule part portant tout le montant.
 */
export function paymentParts(total: number, mode: string, split: PaymentSplit | null): PaymentPart[] {
  const montantTotal = Math.max(0, Math.round(total));
  if (!split || split.montant <= 0) return [{ mode, montant: montantTotal }];
  const deuxieme = Math.min(Math.round(split.montant), montantTotal);
  const premiere = montantTotal - deuxieme;
  const parts: PaymentPart[] = [];
  if (premiere > 0) parts.push({ mode, montant: premiere });
  if (deuxieme > 0) parts.push({ mode: split.mode, montant: deuxieme });
  return parts.length > 0 ? parts : [{ mode, montant: montantTotal }];
}

/** Message d'erreur en français, ou null si la répartition est valide. */
export function validerSplit(total: number, mode: string, split: PaymentSplit | null): string | null {
  if (!split) return null;
  const montantTotal = Math.round(total);
  if (montantTotal <= 0) return "Renseignez d'abord le montant encaissé.";
  if (!split.mode) return "Choisissez le second moyen de paiement.";
  if (split.mode === mode) return "Les deux moyens de paiement doivent être différents.";
  if (!Number.isFinite(split.montant) || split.montant <= 0) return "Le montant de la seconde part doit être supérieur à 0.";
  if (Math.round(split.montant) >= montantTotal) {
    return "La seconde part doit rester inférieure au montant total encaissé.";
  }
  return null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ");

/** « Espèces 50 000 FCFA + Wave 55 000 FCFA » */
export function libelleRepartition(parts: PaymentPart[]): string {
  return parts.map((p) => `${labelMoyen(p.mode)} ${fmt(p.montant)} FCFA`).join(" + ");
}

/** Répartition prête à afficher sur un reçu, ou null si un seul moyen. */
export function repartitionPourRecu(parts: PaymentPart[]): string | null {
  return parts.length > 1 ? `Règlement en ${parts.length} moyens : ${libelleRepartition(parts)}` : null;
}
