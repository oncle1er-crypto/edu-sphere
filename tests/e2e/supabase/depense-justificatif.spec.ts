import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { SUPABASE_URL, ANON_KEY, SERVICE_KEY, SUPABASE_TESTS_READY,
  adminInsert, adminDelete, createTestUser, deleteTestUser, createEcoleFixture, deleteEcoleFixture } from './helpers';

test.skip(!SUPABASE_TESTS_READY, 'Clés locales de test nécessaires');
for (const role of ['admin', 'comptable', 'secretaire'] as const) {
  test(`${role} : justificatif brouillon, verrouillage et nettoyage`, async ({ request }) => {
    const school = await createEcoleFixture(request);
    const user = await createTestUser(request, school.ecoleId, role);
    const expense = await adminInsert(request, 'depenses', {
      ecole_id: school.ecoleId, libelle: 'Test justificatif', montant: 100,
      date_depense: new Date().toISOString().slice(0, 10), statut: 'en_attente',
    });
    const path = `${school.ecoleId}/${expense.id}/justificatif-${randomUUID()}.pdf`;
    const headers = { apikey: ANON_KEY!, Authorization: `Bearer ${user.jwt}` };
    const adminHeaders = { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` };
    try {
      const upload = await request.post(`${SUPABASE_URL}/storage/v1/object/justificatifs-depenses/${path}`, {
        headers: { ...headers, 'Content-Type': 'application/pdf' }, data: Buffer.from('%PDF-1.4\n test'),
      });
      expect(upload.ok(), await upload.text()).toBeTruthy();
      const attach = await request.patch(`${SUPABASE_URL}/rest/v1/depenses?id=eq.${expense.id}`, {
        headers: { ...headers, Prefer: 'return=representation' }, data: { justificatif_chemin: path, justificatif_nom: 'test.pdf' },
      });
      expect(attach.ok(), await attach.text()).toBeTruthy();
      expect((await attach.json())).toHaveLength(1);
      const signed = await request.post(`${SUPABASE_URL}/storage/v1/object/sign/justificatifs-depenses/${path}`, {
        headers, data: { expiresIn: 60 },
      });
      expect(signed.ok(), await signed.text()).toBeTruthy();
      const validate = await request.patch(`${SUPABASE_URL}/rest/v1/depenses?id=eq.${expense.id}`, {
        headers: adminHeaders, data: { statut: 'validee' },
      });
      expect(validate.ok(), await validate.text()).toBeTruthy();
      const change = await request.patch(`${SUPABASE_URL}/rest/v1/depenses?id=eq.${expense.id}`, {
        headers: { ...headers, Prefer: 'return=representation' }, data: { justificatif_nom: 'changed.pdf' },
      });
      // La secrétaire est filtrée par RLS ; les autres rôles sont bloqués par le trigger.
      if (change.ok()) expect(await change.json()).toEqual([]);
      else expect(change.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await request.delete(`${SUPABASE_URL}/storage/v1/object/justificatifs-depenses`, {
        headers: adminHeaders, data: { prefixes: [path] },
      });
      await adminDelete(request, 'depenses', 'id', expense.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, school);
    }
  });
}
