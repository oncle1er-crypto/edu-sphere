import { describe, expect, it } from "vitest";
import { filterVacationScope } from "./filterVacationScope";

const source = {
  classes: [
    { id: "cp", cycle_id: "primaire" },
    { id: "six", cycle_id: "secondaire" },
    { id: "commun", cycle_id: null },
  ],
  eleves: [
    { id: "e-cp", classe_id: "cp" },
    { id: "e-six", classe_id: "six" },
    { id: "e-commun", classe_id: "commun" },
  ],
  paiements: [
    { id: "p-cp", classe_id: "cp", eleve_id: "e-cp" },
    { id: "p-six", classe_id: "six", eleve_id: "e-six" },
    { id: "p-commun", classe_id: "commun", eleve_id: "e-commun" },
    { id: "p-incoherent", classe_id: "cp", eleve_id: "e-six" },
  ],
  enseignants: [
    { id: "t-cp", classe_id: "cp" },
    { id: "t-six", classe_id: "six" },
    { id: "t-commun", classe_id: null },
  ],
  honoraires: [
    { id: "h-cp", enseignant_id: "t-cp" },
    { id: "h-six", enseignant_id: "t-six" },
    { id: "h-commun", enseignant_id: "t-commun" },
  ],
};

describe("filterVacationScope", () => {
  it("conserve tout en vue globale", () => {
    expect(filterVacationScope(source, true, () => false)).toBe(source);
  });

  it("conserve le niveau choisi, les données communes et leurs dépendances", () => {
    const result = filterVacationScope(source, false, (cycleId) => !cycleId || cycleId === "primaire");
    expect(result.classes.map((row) => row.id)).toEqual(["cp", "commun"]);
    expect(result.eleves.map((row) => row.id)).toEqual(["e-cp", "e-commun"]);
    expect(result.paiements.map((row) => row.id)).toEqual(["p-cp", "p-commun"]);
    expect(result.enseignants.map((row) => row.id)).toEqual(["t-cp", "t-commun"]);
    expect(result.honoraires.map((row) => row.id)).toEqual(["h-cp", "h-commun"]);
  });
});
