import { describe, expect, it } from "vitest";
import { computeRenewalTargets, type RenewalSubscriber } from "./serviceRenewal";

const base: RenewalSubscriber = {
  abonnement_id: "abo-1",
  eleve_id: "eleve-1",
  eleve_nom: "Awa Koffi",
  classe_nom: "CM2",
  statut: "actif",
  jours_alerte: 7,
  factures: [],
};

describe("computeRenewalTargets", () => {
  it("signale une couverture payée qui expire dans le délai configuré", () => {
    const result = computeRenewalTargets([{
      ...base,
      factures: [{ montant: 30_000, montant_paye: 30_000, date_echeance: "2026-06-01", date_fin_validite: "2026-09-07" }],
    }], new Date("2026-09-01T12:00:00Z"));

    expect(result).toMatchObject([{
      eleve_id: "eleve-1",
      jours_restants: 6,
      statut: "a_renouveler",
    }]);
  });

  it("signale une couverture expirée sans suspendre l'abonnement", () => {
    const result = computeRenewalTargets([{
      ...base,
      factures: [{ montant: 30_000, montant_paye: 30_000, date_echeance: "2026-06-01", date_fin_validite: "2026-08-30" }],
    }], new Date("2026-09-01T00:00:00Z"));

    expect(result[0]).toMatchObject({ jours_restants: -2, statut: "expire" });
  });

  it("utilise la période payée la plus lointaine en cas de renouvellement anticipé", () => {
    const result = computeRenewalTargets([{
      ...base,
      factures: [
        { montant: 30_000, montant_paye: 30_000, date_echeance: "2026-06-01", date_fin_validite: "2026-09-05" },
        { montant: 30_000, montant_paye: 30_000, date_echeance: "2026-09-01", date_fin_validite: "2026-12-31" },
      ],
    }], new Date("2026-09-01T00:00:00Z"));

    expect(result).toEqual([]);
  });

  it("ignore les factures partielles, annulées et les abonnements arrêtés", () => {
    const result = computeRenewalTargets([
      {
        ...base,
        factures: [{ montant: 30_000, montant_paye: 10_000, date_echeance: "2026-06-01", date_fin_validite: "2026-09-02" }],
      },
      {
        ...base,
        abonnement_id: "abo-2",
        statut: "resilie",
        factures: [{ montant: 30_000, montant_paye: 30_000, date_echeance: "2026-06-01", date_fin_validite: "2026-09-02" }],
      },
      {
        ...base,
        abonnement_id: "abo-3",
        factures: [{ montant: 30_000, montant_paye: 30_000, date_echeance: "2026-06-01", date_fin_validite: "2026-09-02", statut: "annulee" }],
      },
    ], new Date("2026-09-01T00:00:00Z"));

    expect(result).toEqual([]);
  });
});
