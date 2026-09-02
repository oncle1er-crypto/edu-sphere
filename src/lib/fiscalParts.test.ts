import { describe, expect, it } from "vitest";
import { calculerPartsFiscales, partsFiscalesValides } from "./fiscalParts";

describe("calcul des parts fiscales", () => {
  it.each([
    ["Célibataire", "M", 0, 1],
    ["Divorcé(e)", "F", 2, 2.5],
    ["Marié(e)", "M", 0, 2],
    ["Marié(e)", "M", 2, 3],
    ["Veuf/Veuve", "M", 1, 2.5],
    ["Marié(e)", "F", 4, 1],
    ["Célibataire", "F", 20, 5],
  ])("%s, %s, %i enfant(s) donne %s part(s)", (situation, sexe, enfants, attendu) => {
    expect(calculerPartsFiscales(situation, sexe, enfants)).toBe(attendu);
  });

  it("n'accepte que les demi-parts entre 1 et 5", () => {
    expect(partsFiscalesValides(1.5)).toBe(true);
    expect(partsFiscalesValides(1.2)).toBe(false);
    expect(partsFiscalesValides(5.5)).toBe(false);
  });
});
