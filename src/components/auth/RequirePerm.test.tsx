import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequirePerm } from "./RequirePerm";

// Garde de route critique pour la sécurité applicative : si elle laisse
// passer un utilisateur non autorisé (ou bloque à tort un utilisateur
// légitime), c'est un incident de sécurité ou de disponibilité. On mocke
// usePermissions pour tester les 3 états possibles (chargement / refusé /
// autorisé) sans dépendre de Supabase.

const mockUsePermissions = vi.fn();
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

function renderGuarded(module = "finances") {
  return render(
    <MemoryRouter initialEntries={["/finances"]}>
      <Routes>
        <Route
          path="/finances"
          element={
            <RequirePerm module={module}>
              <div>Contenu protégé</div>
            </RequirePerm>
          }
        />
        <Route path="/" element={<div>Page d'accueil</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequirePerm", () => {
  beforeEach(() => {
    mockUsePermissions.mockReset();
  });

  it("affiche un indicateur de chargement pendant la vérification des permissions", () => {
    mockUsePermissions.mockReturnValue({ can: () => false, loading: true });
    renderGuarded();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
    expect(screen.queryByText("Page d'accueil")).not.toBeInTheDocument();
  });

  it("redirige vers la page d'accueil si l'utilisateur n'a pas la permission", () => {
    mockUsePermissions.mockReturnValue({ can: () => false, loading: false });
    renderGuarded();
    expect(screen.getByText("Page d'accueil")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche le contenu si l'utilisateur a la permission", () => {
    mockUsePermissions.mockReturnValue({ can: () => true, loading: false });
    renderGuarded();
    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });

  it("interroge can() avec le bon module et l'action par défaut 'view'", () => {
    const can = vi.fn(() => true);
    mockUsePermissions.mockReturnValue({ can, loading: false });
    renderGuarded("finances");
    expect(can).toHaveBeenCalledWith("finances", "view");
  });
});
