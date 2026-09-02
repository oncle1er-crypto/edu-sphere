import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NetPayrollDialog from "./NetPayrollDialog";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));
vi.mock("@/components/ui/searchable-select", () => ({
  SearchableSelect: ({ value, onValueChange, options }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select aria-label="Membre du personnel" value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">Choisir</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

describe("NetPayrollDialog", () => {
  beforeEach(() => toastError.mockReset());

  it("refuse un net nul ou décimal avant tout appel serveur", async () => {
    const onGenerate = vi.fn();
    render(
      <NetPayrollDialog
        open
        onOpenChange={vi.fn()}
        mois={9}
        annee={2026}
        personnel={[{ value: "p1", label: "Alpha Test" }]}
        onGenerate={onGenerate}
      />,
    );
    fireEvent.change(screen.getByLabelText("Membre du personnel"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Net à payer souhaité (FCFA) *"), { target: { value: "100000.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Générer le brouillon" }));
    expect(onGenerate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Le net à payer doit être un montant entier strictement positif");
  });

  it("transmet exactement l'employé, la période et le net saisis", async () => {
    const onGenerate = vi.fn().mockResolvedValue(true);
    render(
      <NetPayrollDialog
        open
        onOpenChange={vi.fn()}
        mois={9}
        annee={2026}
        personnel={[{ value: "p1", label: "Alpha Test" }]}
        onGenerate={onGenerate}
      />,
    );
    fireEvent.change(screen.getByLabelText("Membre du personnel"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Net à payer souhaité (FCFA) *"), { target: { value: "150000" } });
    fireEvent.click(screen.getByRole("button", { name: "Générer le brouillon" }));
    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith("p1", 9, 2026, 150000));
  });
});
