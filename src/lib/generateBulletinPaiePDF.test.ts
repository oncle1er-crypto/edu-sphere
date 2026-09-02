import { describe, expect, it } from "vitest";
import { generateBulletinPaiePDF, type BulletinPaieData } from "./generateBulletinPaiePDF";

describe("generateBulletinPaiePDF", () => {
  it("affiche la date, l'ancienneté et la prime de transport dans les informations", async () => {
    const data: BulletinPaieData = {
      ecole: { nom: "École Test" },
      salarie: {
        nom: "Kouassi",
        prenom: "Aya",
        date_embauche: "2022-09-25",
        anciennete_annees: 4,
        prime_transport: 30000,
      },
      mois: 9,
      annee: 2026,
      statut: "brouillon",
      lignes: [
        { libelle: "Salaire de base", base: 100000, taux: null, montant: 100000, type: "gain" },
        { libelle: "Prime de transport", base: 0, taux: null, montant: 30000, type: "gain" },
      ],
      total_gains: 130000,
      total_retenues: 0,
      net_a_payer: 130000,
      total_charges_patronales: 0,
      cout_employeur: 130000,
      brut_imposable: 100000,
      base_cnps: 100000,
      periode_debut: "2026-09-01",
      periode_fin: "2026-09-30",
      cumuls_annuels: {
        total_gains: 130000,
        brut_imposable: 100000,
        total_retenues: 0,
        net_a_payer: 130000,
        base_cnps: 100000,
        total_charges_patronales: 0,
      },
    };

    const pdf = await generateBulletinPaiePDF(data);
    const commandes = (pdf.internal.pages as unknown as string[][]).flat().join("\n");
    expect(commandes).toContain("Date d'embauche");
    expect(commandes).toContain("25/09/2022");
    expect(commandes).toContain("Ancienneté");
    expect(commandes).toContain("Prime de transport");
    expect(commandes).toContain("30 000 FCFA");
  });
});
