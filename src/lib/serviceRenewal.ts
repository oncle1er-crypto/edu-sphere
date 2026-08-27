export interface RenewalInvoice {
  montant: number;
  montant_paye: number;
  date_echeance: string;
  date_fin_validite?: string | null;
  statut?: string;
}

export interface RenewalSubscriber {
  abonnement_id: string;
  eleve_id: string;
  eleve_nom: string;
  classe_nom: string;
  statut: string;
  jours_alerte: number;
  factures: RenewalInvoice[];
}

export interface RenewalTarget {
  abonnement_id: string;
  eleve_id: string;
  eleve_nom: string;
  classe_nom: string;
  date_fin_validite: string;
  jours_restants: number;
  statut: "a_renouveler" | "expire";
}

const DAY_MS = 86_400_000;

function utcDay(value: string | Date): number {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * La couverture court jusqu'à la date la plus lointaine d'une facture entièrement payée.
 * Une facture partielle ou annulée ne prolonge jamais la validité du service.
 */
export function computeRenewalTargets(
  subscribers: RenewalSubscriber[],
  today = new Date(),
): RenewalTarget[] {
  const todayDay = utcDay(today);

  return subscribers.flatMap((subscriber) => {
    if (subscriber.statut !== "actif") return [];

    const coverageEnd = getPaidCoverageEnd(subscriber.factures);
    if (!coverageEnd) return [];

    const daysLeft = Math.round((utcDay(coverageEnd) - todayDay) / DAY_MS);
    const alertDays = Math.min(30, Math.max(1, subscriber.jours_alerte || 7));
    if (daysLeft > alertDays) return [];

    return [{
      abonnement_id: subscriber.abonnement_id,
      eleve_id: subscriber.eleve_id,
      eleve_nom: subscriber.eleve_nom,
      classe_nom: subscriber.classe_nom,
      date_fin_validite: coverageEnd,
      jours_restants: daysLeft,
      statut: daysLeft < 0 ? "expire" as const : "a_renouveler" as const,
    }];
  }).sort((a, b) => a.jours_restants - b.jours_restants || a.eleve_nom.localeCompare(b.eleve_nom, "fr"));
}

export function getPaidCoverageEnd(invoices: RenewalInvoice[]): string | null {
  return invoices
    .filter((invoice) =>
      invoice.statut !== "annulee" &&
      invoice.montant > 0 &&
      invoice.montant_paye >= invoice.montant,
    )
    .map((invoice) => invoice.date_fin_validite)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1) ?? null;
}

export function formatCoverageEnd(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR");
}
