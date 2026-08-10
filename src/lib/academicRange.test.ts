import { describe, it, expect } from "vitest";
import { debutAnticipe, plageFinanciereAnnee, MOIS_ANTICIPATION_FINANCIERE } from "./academicRange";

// Bug constaté le 10/08/2026 : les dépenses enregistrées entre la fin d'une
// année scolaire et le début officiel de la suivante (préparatifs de
// rentrée) étaient invisibles dans la liste "Dépenses", le tableau de bord
// Finances et les rapports — ces écrans filtraient strictement sur
// [activeAnnee.debut, activeAnnee.fin], sans la fenêtre d'anticipation déjà
// appliquée par useBilanComptable. Exemple réel : année active du
// 2026-09-14 au 2027-06-30, dépenses réelles du 2026-07-13 au 2026-08-04
// (donc avant le début officiel) totalement absentes de la liste.
describe("academicRange", () => {
  it("recule le début de la plage de MOIS_ANTICIPATION_FINANCIERE mois, au 1er du mois", () => {
    expect(debutAnticipe("2026-09-14")).toBe("2026-07-01");
  });

  it("gère un changement d'année civile lors du recul", () => {
    expect(debutAnticipe("2027-01-15")).toBe("2026-11-01");
  });

  it("plageFinanciereAnnee couvre des dépenses antérieures au début officiel de l'année active", () => {
    const activeAnnee = { debut: "2026-09-14", fin: "2027-06-30" };
    const range = plageFinanciereAnnee(activeAnnee);
    expect(range).toBeDefined();
    // Cas réel constaté en production : dépenses du 13/07 au 04/08/2026.
    const depensesReelles = ["2026-07-13", "2026-07-30", "2026-08-04"];
    for (const d of depensesReelles) {
      expect(d >= range!.from && d <= range!.to).toBe(true);
    }
  });

  it("ne couvre pas une date de l'année précédente, hors fenêtre d'anticipation", () => {
    const activeAnnee = { debut: "2026-09-14", fin: "2027-06-30" };
    const range = plageFinanciereAnnee(activeAnnee)!;
    // L'année précédente s'est terminée le 2026-07-03 : une dépense de juin
    // 2026 ne doit pas être aspirée dans l'année suivante.
    expect("2026-06-15" >= range.from).toBe(false);
  });

  it("retourne undefined si aucune année n'est chargée", () => {
    expect(plageFinanciereAnnee(null)).toBeUndefined();
    expect(plageFinanciereAnnee(undefined)).toBeUndefined();
  });

  it("MOIS_ANTICIPATION_FINANCIERE reste la valeur de référence partagée (2 mois)", () => {
    expect(MOIS_ANTICIPATION_FINANCIERE).toBe(2);
  });
});
