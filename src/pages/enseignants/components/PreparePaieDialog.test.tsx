import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreparePaieDialog from "./PreparePaieDialog";
import type { ApercuPaie, ApercuPersonnel, EtatPersonnel } from "@/hooks/useRhPaie";

function personnel(id: string, nom: string, etat: EtatPersonnel): ApercuPersonnel {
  return {
    ok: etat !== "a_corriger",
    personnel_id: id,
    matricule: `ENS-${id}`,
    nom,
    prenom: "Test",
    poste: "Enseignant",
    anciennete_annees: 1,
    anciennete_taux: null,
    total_gains: etat === "a_corriger" ? 0 : 100_000,
    brut_imposable: 100_000,
    base_cnps: 100_000,
    total_retenues: 5_000,
    total_charges_patronales: 10_000,
    net_a_payer: etat === "a_corriger" ? 0 : 95_000,
    cout_employeur: 110_000,
    lignes: [],
    alertes: etat === "a_corriger" ? ["Salaire à compléter"] : [],
    etat,
  };
}

const apercuData: ApercuPaie = {
  ok: true,
  mois: 9,
  annee: 2026,
  prets: 2,
  a_corriger: 1,
  deja_crees: 0,
  net_estime: 190_000,
  personnels: [
    personnel("pret-1", "Alpha", "pret"),
    personnel("pret-2", "Beta", "pret"),
    personnel("invalide-1", "Gamma", "a_corriger"),
  ],
};

describe("PreparePaieDialog", () => {
  it("génère uniquement les employés prêts sélectionnés", async () => {
    const apercu = vi.fn().mockResolvedValue(apercuData);
    const genererBrouillons = vi.fn().mockResolvedValue(1);

    render(
      <PreparePaieDialog
        open
        onOpenChange={vi.fn()}
        apercu={apercu}
        genererBrouillons={genererBrouillons}
        moisInitial={9}
        anneeInitiale={2026}
      />,
    );

    await screen.findByText("Alpha Test");
    expect(apercu).toHaveBeenCalledWith(9, 2026);
    expect(screen.getByRole("button", { name: "Créer 0 brouillon(s)" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Sélectionner Gamma Test" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Sélectionner Alpha Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Créer 1 brouillon(s)" }));

    await waitFor(() => {
      expect(genererBrouillons).toHaveBeenCalledWith(9, 2026, ["pret-1"]);
    });
  });

  it("permet de sélectionner et désélectionner tous les dossiers prêts", async () => {
    render(
      <PreparePaieDialog
        open
        onOpenChange={vi.fn()}
        apercu={vi.fn().mockResolvedValue(apercuData)}
        genererBrouillons={vi.fn()}
        moisInitial={9}
        anneeInitiale={2026}
      />,
    );

    const toutSelectionner = await screen.findByRole("button", { name: "Sélectionner les 2 prêts" });
    fireEvent.click(toutSelectionner);
    expect(screen.getByRole("button", { name: "Créer 2 brouillon(s)" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Tout désélectionner" }));
    expect(screen.getByRole("button", { name: "Créer 0 brouillon(s)" })).toBeDisabled();
  });
});
