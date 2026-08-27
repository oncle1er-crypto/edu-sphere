import { describe, it, expect } from "vitest";
import {
  buildJourBuckets,
  buildSemaineBuckets,
  buildMoisBuckets,
  buildTrimestreBuckets,
  clipBuckets,
  buildRollingSixMonths,
  aggregateByMonth,
} from "./dateBuckets";

describe("buildJourBuckets", () => {
  it("un bucket par jour calendaire, bornes incluses", () => {
    const b = buildJourBuckets("2026-03-10", "2026-03-12");
    expect(b.map((x) => x.key)).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);
    expect(b[0].from).toBe("2026-03-10");
    expect(b[0].to).toBe("2026-03-10");
  });

  it("un seul jour si from === to", () => {
    expect(buildJourBuckets("2026-01-01", "2026-01-01")).toHaveLength(1);
  });

  it("traverse correctement un changement de mois", () => {
    const b = buildJourBuckets("2026-01-30", "2026-02-02");
    expect(b.map((x) => x.key)).toEqual(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]);
  });
});

describe("rolling month statistics", () => {
  it("conserve l'année dans les clés lors d'un passage décembre/janvier", () => {
    const buckets = buildRollingSixMonths(new Date(2027, 1, 15));
    expect(buckets.map((b) => b.key)).toEqual([
      "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02",
    ]);
  });

  it("ignore les données historiques hors de la fenêtre", () => {
    const buckets = buildRollingSixMonths(new Date(2027, 1, 15));
    const totals = aggregateByMonth(
      [
        { date: "2026-01-10", count: 999 },
        { date: "2027-01-10", count: 12 },
      ],
      buckets,
      (row) => row.date,
      (row) => row.count
    );
    expect(totals.find((b) => b.key === "2027-01")?.value).toBe(12);
    expect(totals.reduce((sum, b) => sum + b.value, 0)).toBe(12);
  });
});

describe("buildSemaineBuckets", () => {
  it("chaque semaine commence un lundi et finit un dimanche", () => {
    const b = buildSemaineBuckets("2026-03-10", "2026-03-10"); // un mardi
    expect(b).toHaveLength(1);
    // 2026-03-10 est un mardi -> semaine du lundi 2026-03-09 au dimanche 2026-03-15.
    expect(b[0].from).toBe("2026-03-09");
    expect(b[0].to).toBe("2026-03-15");
  });

  it("couvre plusieurs semaines consécutives sans trou ni chevauchement", () => {
    const b = buildSemaineBuckets("2026-03-01", "2026-03-20");
    for (let i = 1; i < b.length; i++) {
      const prevTo = new Date(b[i - 1].to);
      const curFrom = new Date(b[i].from);
      expect(curFrom.getTime() - prevTo.getTime()).toBe(86400000); // exactement 1 jour d'écart
    }
  });
});

describe("buildMoisBuckets", () => {
  it("un bucket par mois calendaire, du 1er au dernier jour", () => {
    const b = buildMoisBuckets("2026-01-15", "2026-03-05");
    expect(b.map((x) => x.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(b[0].from).toBe("2026-01-01");
    expect(b[0].to).toBe("2026-01-31");
    expect(b[1].to).toBe("2026-02-28"); // 2026 n'est pas bissextile
  });

  it("gère une année bissextile (février 2028 = 29 jours)", () => {
    const b = buildMoisBuckets("2028-02-01", "2028-02-28");
    expect(b[0].to).toBe("2028-02-29");
  });

  it("traverse un changement d'année civile", () => {
    const b = buildMoisBuckets("2026-12-01", "2027-01-31");
    expect(b.map((x) => x.key)).toEqual(["2026-12", "2027-01"]);
  });
});

describe("buildTrimestreBuckets", () => {
  it("regroupe les mois en 3 blocs consécutifs de taille égale (arrondi supérieur)", () => {
    const mois = buildMoisBuckets("2026-09-01", "2027-06-30"); // 10 mois d'année scolaire
    const trimestres = buildTrimestreBuckets(mois);
    expect(trimestres).toHaveLength(3);
    // taille = ceil(10/3) = 4 mois par trimestre (sauf le dernier, tronqué)
    expect(trimestres[0].from).toBe(mois[0].from);
    expect(trimestres[0].to).toBe(mois[3].to);
    expect(trimestres[2].to).toBe(mois[mois.length - 1].to);
  });

  it("retourne un tableau vide si aucun mois n'est fourni", () => {
    expect(buildTrimestreBuckets([])).toEqual([]);
  });

  it("ne produit jamais plus de 3 trimestres, même avec très peu de mois", () => {
    const mois = buildMoisBuckets("2026-09-01", "2026-10-31"); // 2 mois seulement
    const trimestres = buildTrimestreBuckets(mois);
    expect(trimestres.length).toBeLessThanOrEqual(3);
  });
});

describe("clipBuckets", () => {
  it("ne garde que les buckets qui recoupent l'intervalle demandé", () => {
    const jours = buildJourBuckets("2026-03-01", "2026-03-10");
    const clipped = clipBuckets(jours, "2026-03-05", "2026-03-07");
    expect(clipped.map((b) => b.key)).toEqual(["2026-03-05", "2026-03-06", "2026-03-07"]);
  });

  it("retourne un tableau vide si aucun bucket ne recoupe l'intervalle", () => {
    const jours = buildJourBuckets("2026-01-01", "2026-01-05");
    expect(clipBuckets(jours, "2026-06-01", "2026-06-30")).toEqual([]);
  });
});
