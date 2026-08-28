export interface ServiceInvoiceDates {
  categorie: string | null;
  date_echeance: string | null;
  date_fin_validite: string | null;
}

/**
 * La cantine et le transport expirent à la fin de la période couverte.
 * L'échéance de paiement reste uniquement la date limite d'encaissement.
 */
export function serviceReceiptExpiry(invoice: ServiceInvoiceDates): string | undefined {
  const isService = invoice.categorie === "cantine" || invoice.categorie === "transport";
  if (!isService) return undefined;
  return invoice.date_fin_validite ?? invoice.date_echeance ?? undefined;
}
