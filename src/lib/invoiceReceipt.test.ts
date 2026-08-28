import { describe, expect, it } from "vitest";
import { serviceReceiptExpiry } from "./invoiceReceipt";

describe("serviceReceiptExpiry", () => {
  it("utilise la fin de validité de la cantine plutôt que la date limite de paiement", () => {
    expect(serviceReceiptExpiry({
      categorie: "cantine",
      date_echeance: "2027-04-15",
      date_fin_validite: "2027-06-30",
    })).toBe("2027-06-30");
  });

  it("utilise aussi la fin de validité pour le transport", () => {
    expect(serviceReceiptExpiry({
      categorie: "transport",
      date_echeance: "2026-10-05",
      date_fin_validite: "2026-12-31",
    })).toBe("2026-12-31");
  });

  it("garde l'échéance comme repli pour les anciennes factures de service", () => {
    expect(serviceReceiptExpiry({
      categorie: "cantine",
      date_echeance: "2026-09-15",
      date_fin_validite: null,
    })).toBe("2026-09-15");
  });

  it("n'ajoute aucune date de validité aux autres factures", () => {
    expect(serviceReceiptExpiry({
      categorie: "scolarite",
      date_echeance: "2026-09-15",
      date_fin_validite: null,
    })).toBeUndefined();
  });
});
