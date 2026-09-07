import { describe, expect, it } from "vitest";
import {
  buildAvisText,
  categoriesEnRetard,
  fcfa,
  statutAvisEleve,
  totalDu,
  type EleveAvisData,
} from "./lateNotices";

// `Number.toLocaleString("fr-FR")` insère un espace insécable étroit (U+202F)
// comme séparateur de milliers, invisible mais différent d'un espace normal —
// on compare donc toujours via `fcfa()` plutôt que via un littéral " ".

function makeEleve(overrides: Partial<EleveAvisData> = {}): EleveAvisData {
  return {
    eleveId: "e1",
    matricule: "M-001",
    nom: "KOUASSI",
    prenom: "Jean",
    classe: "CM2 A",
    concerne: { scolarite: true },
    retards: {},
    ...overrides,
  };
}

describe("statutAvisEleve", () => {
  it("scénario 1 — élève totalement à jour", () => {
    const e = makeEleve({ concerne: { scolarite: true, cantine: true }, retards: {} });
    expect(statutAvisEleve(e, ["scolarite", "cantine", "transport"])).toBe("ajour");
  });

  it("scénario 2 — retard uniquement scolarité", () => {
    const e = makeEleve({
      concerne: { scolarite: true },
      retards: { scolarite: { montantDu: 35000, echeance: "2026-10-15" } },
    });
    expect(statutAvisEleve(e, ["scolarite", "cantine", "transport"])).toBe("retard");
    expect(categoriesEnRetard(e, ["scolarite", "cantine", "transport"])).toEqual(["scolarite"]);
  });

  it("scénario 3 — retard uniquement cantine", () => {
    const e = makeEleve({
      concerne: { scolarite: true, cantine: true },
      retards: { cantine: { montantDu: 10000, echeance: "2026-09-01" } },
    });
    expect(statutAvisEleve(e, ["scolarite", "cantine", "transport"])).toBe("retard");
  });

  it("scénario 4 — retard uniquement transport", () => {
    const e = makeEleve({
      concerne: { scolarite: true, transport: true },
      retards: { transport: { montantDu: 15000, echeance: "2026-09-01" } },
    });
    expect(statutAvisEleve(e, ["scolarite", "cantine", "transport"])).toBe("retard");
  });

  it("scénario 5 — retard sur deux catégories", () => {
    const e = makeEleve({
      concerne: { scolarite: true, cantine: true },
      retards: {
        scolarite: { montantDu: 35000, echeance: "2026-10-15" },
        cantine: { montantDu: 10000, echeance: "2026-09-01" },
      },
    });
    expect(categoriesEnRetard(e, ["scolarite", "cantine", "transport"])).toEqual(["scolarite", "cantine"]);
    expect(totalDu(e, ["scolarite", "cantine", "transport"])).toBe(45000);
  });

  it("scénario 6 — retard sur les trois catégories", () => {
    const e = makeEleve({
      concerne: { scolarite: true, cantine: true, transport: true },
      retards: {
        scolarite: { montantDu: 35000, echeance: "2026-10-15" },
        cantine: { montantDu: 10000, echeance: "2026-09-01" },
        transport: { montantDu: 5000, echeance: "2026-09-05" },
      },
    });
    expect(categoriesEnRetard(e, ["scolarite", "cantine", "transport"])).toEqual(["scolarite", "cantine", "transport"]);
    expect(totalDu(e, ["scolarite", "cantine", "transport"])).toBe(50000);
  });

  it("scénario 9/10 — élève non inscrit à la cantine/transport => non concerné pour cette catégorie", () => {
    const e = makeEleve({ concerne: { scolarite: true }, retards: {} });
    // Seules cantine/transport sont cochées, l'élève n'a ni l'une ni l'autre.
    expect(statutAvisEleve(e, ["cantine", "transport"])).toBe("non_concerne");
  });

  it("classe sans aucun retard => tous les élèves ressortent 'ajour' ou 'non_concerne', jamais 'retard'", () => {
    const eleves = [
      makeEleve({ eleveId: "a", concerne: { scolarite: true } }),
      makeEleve({ eleveId: "b", concerne: { scolarite: true, cantine: true } }),
    ];
    for (const e of eleves) {
      expect(statutAvisEleve(e, ["scolarite", "cantine", "transport"])).not.toBe("retard");
    }
  });
});

describe("buildAvisText", () => {
  const base = makeEleve({
    nom: "KOUASSI",
    prenom: "Jean",
    classe: "CM2 A",
    concerne: { scolarite: true, cantine: true, transport: true },
    retards: {
      scolarite: { montantDu: 35000, echeance: "2026-10-15" },
      cantine: { montantDu: 10000, echeance: "2026-09-01" },
      transport: { montantDu: 5000, echeance: "2026-09-05" },
    },
  });

  it("adapte la phrase à une seule catégorie en retard", () => {
    const e = makeEleve({ retards: { scolarite: { montantDu: 35000, echeance: "2026-10-15" } } });
    const texte = buildAvisText(e, ["scolarite"], { includeMontant: false, includeEcheance: false });
    expect(texte).toContain("présente un retard concernant : la scolarité.");
  });

  it("adapte la phrase à deux catégories (cantine + transport)", () => {
    const e = makeEleve({
      retards: {
        cantine: { montantDu: 10000, echeance: "2026-09-01" },
        transport: { montantDu: 5000, echeance: "2026-09-05" },
      },
    });
    const texte = buildAvisText(e, ["cantine", "transport"], { includeMontant: false, includeEcheance: false });
    expect(texte).toContain("présente un retard concernant : la cantine et le transport.");
  });

  it("adapte la phrase aux trois catégories", () => {
    const texte = buildAvisText(base, ["scolarite", "cantine", "transport"], { includeMontant: false, includeEcheance: false });
    expect(texte).toContain("présente un retard concernant : la scolarité, la cantine et le transport.");
  });

  it("tient en deux paragraphes quand aucune option n'est activée", () => {
    const texte = buildAvisText(base, ["scolarite"], { includeMontant: false, includeEcheance: false });
    expect(texte.split("\n\n").length).toBe(2);
  });

  it("n'affiche aucun montant si l'option est désactivée (scénario 15)", () => {
    const texte = buildAvisText(base, ["scolarite", "cantine", "transport"], { includeMontant: false, includeEcheance: false });
    expect(texte).not.toContain("F CFA");
  });

  it("affiche le détail par catégorie + le total si l'option montant est activée (scénario 14)", () => {
    const texte = buildAvisText(base, ["scolarite", "cantine", "transport"], { includeMontant: true, includeEcheance: false });
    expect(texte).toContain(`Scolarité : ${fcfa(35000)} F CFA`);
    expect(texte).toContain(`Cantine : ${fcfa(10000)} F CFA`);
    expect(texte).toContain(`Transport : ${fcfa(5000)} F CFA`);
    expect(texte).toContain(`Total restant : ${fcfa(50000)} F CFA`);
  });

  it("n'affiche pas de total quand une seule catégorie est en retard", () => {
    const e = makeEleve({ retards: { scolarite: { montantDu: 35000, echeance: "2026-10-15" } } });
    const texte = buildAvisText(e, ["scolarite"], { includeMontant: true, includeEcheance: false });
    expect(texte).toContain(`Scolarité : ${fcfa(35000)} F CFA`);
    expect(texte).not.toContain("Total restant");
  });

  it("affiche l'échéance la plus ancienne au format JJ/MM/AAAA si l'option est activée", () => {
    const texte = buildAvisText(base, ["scolarite", "cantine", "transport"], { includeMontant: false, includeEcheance: true });
    expect(texte).toContain("Échéance dépassée depuis le 01/09/2026");
  });

  it("ne fait jamais apparaître d'informations sensibles (téléphone, historique) — le texte ne contient que nom/classe/catégories/montant/échéance", () => {
    const texte = buildAvisText(base, ["scolarite", "cantine", "transport"], { includeMontant: true, includeEcheance: true });
    expect(texte).not.toMatch(/\+225|téléphone|historique/i);
  });
});
