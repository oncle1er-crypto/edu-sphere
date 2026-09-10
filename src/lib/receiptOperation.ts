export interface ReceiptOperationLine {
  id: string;
  montant: number;
  mode: string;
  reference: string | null;
  date_paiement: string;
  tranche_numero?: number | null;
  tranche_label?: string | null;
}

export interface ReceiptOperationSummary {
  paiementIds: string[];
  montant: number;
  /** "mixte" lorsque l'opération a été réglée avec plusieurs moyens. */
  mode: string;
  reference: string | null;
  datePaiement: string;
  motif: string | null;
  /** Répartition par moyen de paiement (vide si un seul moyen). */
  repartitionModes: { mode: string; montant: number }[];
}

/**
 * Résume les lignes techniques créées par un encaissement ventilé.
 * Toutes les lignes doivent appartenir au même jour : mélanger deux dates dans
 * un reçu unique rendrait le document comptable ambigu.
 * Plusieurs moyens de paiement sont acceptés (paiement scindé) : le reçu porte
 * alors le mode « mixte » et détaille la répartition.
 */
export function summarizeReceiptOperation(lines: ReceiptOperationLine[]): ReceiptOperationSummary {
  if (lines.length === 0) throw new Error("operation_sans_paiement");

  const dates = new Set(lines.map((line) => line.date_paiement.slice(0, 10)));
  if (dates.size !== 1) throw new Error("operation_dates_incoherentes");

  const modes = Array.from(new Set(lines.map((line) => line.mode)));
  const references = Array.from(new Set(lines.map((line) => line.reference ?? null)));
  if (references.length > 1) throw new Error("operation_references_incoherentes");
  const details = lines
    .filter((line) => line.tranche_numero != null)
    .map((line) => `T${line.tranche_numero} = ${Number(line.montant).toLocaleString("fr-FR")} FCFA`);

  const repartitionModes = modes.length > 1
    ? modes.map((mode) => ({
        mode,
        montant: lines
          .filter((line) => line.mode === mode)
          .reduce((sum, line) => sum + Number(line.montant || 0), 0),
      }))
    : [];

  const parts: string[] = [];
  if (details.length > 1) parts.push(`Répartition du versement : ${details.join(" • ")}`);
  if (repartitionModes.length > 1) {
    parts.push(
      `Règlement en ${repartitionModes.length} moyens : ` +
      repartitionModes
        .map((r) => `${MODE_LABELS[r.mode] ?? r.mode} ${r.montant.toLocaleString("fr-FR")} FCFA`)
        .join(" + "),
    );
  }

  return {
    paiementIds: lines.map((line) => line.id),
    montant: lines.reduce((sum, line) => sum + Number(line.montant || 0), 0),
    mode: modes.length > 1 ? "mixte" : modes[0],
    reference: references[0],
    datePaiement: Array.from(dates)[0],
    motif: parts.length > 0 ? parts.join(" — ") : null,
    repartitionModes,
  };
}

const MODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_money: "MTN MoMo",
  moov_money: "Moov Money",
  virement: "Virement",
  cheque: "Chèque",
  remise: "Remise",
  bourse: "Bourse",
  prise_en_charge: "Prise en charge",
};


export interface TrancheAmount {
  num: number;
  montant: number;
  paye: number;
}

/** Montant proposé quand l'utilisateur ouvre l'encaissement depuis une tranche. */
export function initialPaymentAmount(
  tranches: TrancheAmount[],
  defaultTrancheNum: number | undefined,
  resteAnnuel: number,
): number {
  if (defaultTrancheNum == null) return Math.max(0, resteAnnuel);
  const tranche = tranches.find((item) => item.num === defaultTrancheNum);
  if (!tranche) return Math.max(0, resteAnnuel);
  return Math.max(0, Math.min(resteAnnuel, tranche.montant - tranche.paye));
}
