import { describe, expect, it } from "vitest";
import { bornesMois, verifierCoherenceBulletin } from "./payrollBulletin";

const lignes = [
  { libelle: "Salaire", type: "gain", base: 75_000, taux: null, montant: 75_000 },
  { libelle: "Prime", type: "gain", base: 75_000, taux: 5, montant: 3_750 },
  { libelle: "CNPS", type: "retenue", base: 78_750, taux: 6.3, montant: 4_961 },
  { libelle: "CNPS employeur", type: "charge_patronale", base: 78_750, taux: 7.7, montant: 6_064 },
];

const totaux = {
  total_gains: 78_750,
  total_retenues: 4_961,
  net_a_payer: 73_789,
  total_charges_patronales: 6_064,
  cout_employeur: 84_814,
  brut_imposable: 78_750,
  base_cnps: 78_750,
};

describe("verifierCoherenceBulletin", () => {
  it("accepte un bulletin comptablement cohérent", () => {
    expect(verifierCoherenceBulletin(lignes, totaux)).toEqual([]);
  });

  it("détecte une divergence silencieuse sur le net", () => {
    const erreurs = verifierCoherenceBulletin(lignes, { ...totaux, net_a_payer: 74_000 });
    expect(erreurs).toContain("Le net à payer n'est pas égal aux gains moins les retenues.");
  });

  it("détecte une divergence entre lignes et total", () => {
    const erreurs = verifierCoherenceBulletin(lignes, { ...totaux, total_retenues: 4_000 });
    expect(erreurs).toContain("Le total des retenues ne correspond pas aux lignes du bulletin.");
  });
});

describe("bornesMois", () => {
  it("gère correctement février d'une année bissextile", () => {
    expect(bornesMois(2, 2028)).toEqual({ debut: "2028-02-01", fin: "2028-02-29" });
  });

  it("gère correctement février d'une année non bissextile", () => {
    expect(bornesMois(2, 2026)).toEqual({ debut: "2026-02-01", fin: "2026-02-28" });
  });

  it("refuse un mois invalide", () => {
    expect(() => bornesMois(13, 2026)).toThrow("Période de paie invalide");
  });
});
