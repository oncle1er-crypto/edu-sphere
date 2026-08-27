import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import {
  ANON_KEY,
  SUPABASE_TESTS_READY,
  SUPABASE_TESTS_SKIP_REASON,
  SUPABASE_URL,
  adminDelete,
  callRpc,
  createEcoleFixture,
  createTestUser,
  deleteEcoleFixture,
  deleteTestUser,
} from "./helpers";

test.skip(!SUPABASE_TESTS_READY, SUPABASE_TESTS_SKIP_REASON);

test.describe("Cantine / Transport — autorisations de production", () => {
  test("un utilisateur sans droit Cantine ne peut pas générer de facture", async ({ request }) => {
    const school = await createEcoleFixture(request);
    const teacher = await createTestUser(request, school.ecoleId, "enseignant");
    try {
      const response = await callRpc(request, teacher.jwt, "generer_factures_service", {
        _ecole_id: school.ecoleId,
        _abonnement_id: randomUUID(),
        _service_type: "cantine",
        _forcer: false,
      });
      expect(response.ok(), "un enseignant ne doit pas franchir la RPC SECURITY DEFINER").toBeFalsy();
      expect(await response.text()).toContain("permission_facturation_refusee");
    } finally {
      await deleteTestUser(request, teacher.userId);
      await deleteEcoleFixture(request, school);
    }
  });

  test("un administrateur ne peut pas facturer pour une autre école", async ({ request }) => {
    const ownSchool = await createEcoleFixture(request);
    const otherSchool = await createEcoleFixture(request);
    const admin = await createTestUser(request, ownSchool.ecoleId, "admin");
    try {
      const response = await callRpc(request, admin.jwt, "generer_factures_service", {
        _ecole_id: otherSchool.ecoleId,
        _abonnement_id: randomUUID(),
        _service_type: "transport",
        _forcer: false,
      });
      expect(response.ok(), "l'identifiant école fourni par le client ne doit jamais suffire").toBeFalsy();
      expect(await response.text()).toContain("permission_facturation_refusee");
    } finally {
      await deleteTestUser(request, admin.userId);
      await deleteEcoleFixture(request, otherSchool);
      await deleteEcoleFixture(request, ownSchool);
    }
  });

  test("les écritures Cantine suivent les permissions effectives", async ({ request }) => {
    const school = await createEcoleFixture(request);
    const director = await createTestUser(request, school.ecoleId, "directeur");
    const teacher = await createTestUser(request, school.ecoleId, "enseignant");
    let planningId: string | null = null;
    try {
      const payload = { ecole_id: school.ecoleId, date_service: "2026-10-15", service: "dejeuner" };
      const allowed = await request.post(`${SUPABASE_URL}/rest/v1/cantine_planning`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${director.jwt}`, Prefer: "return=representation" },
        data: payload,
      });
      expect(allowed.ok(), await allowed.text()).toBeTruthy();
      planningId = (await allowed.json())[0].id;

      const denied = await request.post(`${SUPABASE_URL}/rest/v1/cantine_planning`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${teacher.jwt}`, Prefer: "return=representation" },
        data: { ...payload, date_service: "2026-10-16" },
      });
      expect(denied.ok(), "un rôle sans permission Cantine create doit être bloqué par la RLS").toBeFalsy();
    } finally {
      if (planningId) await adminDelete(request, "cantine_planning", "id", planningId);
      await deleteTestUser(request, teacher.userId);
      await deleteTestUser(request, director.userId);
      await deleteEcoleFixture(request, school);
    }
  });
});
