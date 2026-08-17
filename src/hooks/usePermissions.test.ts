import { describe, it, expect } from "vitest";
import { computeCan, type UserPermission } from "./usePermissions";

// Logique de permissions effectives : union rôle + overrides côté RPC
// (get_effective_permissions), résolue ici côté client dans computeCan().
// Module critique : une erreur ici expose des écrans ou actions non
// autorisés, ou au contraire bloque à tort un utilisateur légitime.

const permsEleves: UserPermission = {
  module_key: "eleves",
  can_view: true,
  can_create: true,
  can_update: false,
  can_delete: false,
  can_export: true,
};

describe("computeCan", () => {
  it("un admin a toujours toutes les permissions, même sans ligne de perms", () => {
    expect(computeCan([], true, "finances", "delete")).toBe(true);
    expect(computeCan([], true, "nimporte_quoi", "view")).toBe(true);
  });

  it("un non-admin sans permission sur le module est refusé", () => {
    expect(computeCan([], false, "eleves", "view")).toBe(false);
  });

  it("un non-admin avec permission accordée sur l'action précise est autorisé", () => {
    expect(computeCan([permsEleves], false, "eleves", "view")).toBe(true);
    expect(computeCan([permsEleves], false, "eleves", "create")).toBe(true);
    expect(computeCan([permsEleves], false, "eleves", "export")).toBe(true);
  });

  it("un non-admin sans permission sur une action précise est refusé, même si le module existe", () => {
    expect(computeCan([permsEleves], false, "eleves", "update")).toBe(false);
    expect(computeCan([permsEleves], false, "eleves", "delete")).toBe(false);
  });

  it("un module non listé dans les permissions est refusé par défaut (deny by default)", () => {
    expect(computeCan([permsEleves], false, "finances", "view")).toBe(false);
  });

  it("l'action par défaut est 'view'", () => {
    expect(computeCan([permsEleves], false, "eleves")).toBe(true);
    expect(computeCan([], false, "finances")).toBe(false);
  });
});
