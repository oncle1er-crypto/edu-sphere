import { describe, expect, it } from "vitest";
import { initialPaymentAmount, summarizeReceiptOperation } from "./receiptOperation";

describe("summarizeReceiptOperation", () => {
  it("conserve la vraie date et additionne une opération multi-tranches", () => {
    const summary = summarizeReceiptOperation([
      { id: "p1", montant: 60_000, mode: "wave", reference: "ENC-24", date_paiement: "2026-08-24", tranche_numero: 1 },
      { id: "p2", montant: 25_000, mode: "wave", reference: "ENC-24", date_paiement: "2026-08-24", tranche_numero: 2 },
    ]);

    expect(summary).toMatchObject({
      paiementIds: ["p1", "p2"],
      montant: 85_000,
      mode: "wave",
      reference: "ENC-24",
      datePaiement: "2026-08-24",
    });
    expect(summary.motif).toContain("T1");
    expect(summary.motif).toContain("T2");
  });

  it("refuse de fusionner des dates différentes", () => {
    expect(() => summarizeReceiptOperation([
      { id: "p1", montant: 20_000, mode: "wave", reference: "A", date_paiement: "2026-08-03", tranche_numero: 1 },
      { id: "p2", montant: 25_000, mode: "wave", reference: "B", date_paiement: "2026-08-24", tranche_numero: 2 },
    ])).toThrow("operation_dates_incoherentes");
  });

  it("refuse de fusionner des moyens de paiement différents", () => {
    expect(() => summarizeReceiptOperation([
      { id: "p1", montant: 20_000, mode: "wave", reference: "A", date_paiement: "2026-08-24", tranche_numero: 1 },
      { id: "p2", montant: 25_000, mode: "especes", reference: "A", date_paiement: "2026-08-24", tranche_numero: 2 },
    ])).toThrow("operation_modes_incoherents");
  });

  it("refuse de fusionner des références différentes, même si l'une est vide", () => {
    expect(() => summarizeReceiptOperation([
      { id: "p1", montant: 20_000, mode: "wave", reference: "A", date_paiement: "2026-08-24", tranche_numero: 1 },
      { id: "p2", montant: 25_000, mode: "wave", reference: null, date_paiement: "2026-08-24", tranche_numero: 2 },
    ])).toThrow("operation_references_incoherentes");
  });
});

describe("initialPaymentAmount", () => {
  const tranches = [
    { num: 1, montant: 80_000, paye: 80_000 },
    { num: 2, montant: 55_000, paye: 15_000 },
    { num: 3, montant: 40_000, paye: 0 },
  ];

  it("propose uniquement le reste de la tranche sélectionnée", () => {
    expect(initialPaymentAmount(tranches, 2, 80_000)).toBe(40_000);
  });

  it("propose le reste annuel sans tranche ciblée", () => {
    expect(initialPaymentAmount(tranches, undefined, 80_000)).toBe(80_000);
  });

  it("ne propose jamais un montant négatif pour une tranche déjà soldée", () => {
    expect(initialPaymentAmount(tranches, 1, 80_000)).toBe(0);
  });
});
