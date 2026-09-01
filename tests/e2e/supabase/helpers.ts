import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

/**
 * Helpers partagés pour les tests « backend » (RLS, RPC, triggers) qui
 * parlent directement à l'API REST/Auth de Supabase, sur le même principe
 * que tests/e2e/paiements-annulation-solde.spec.ts : aucune dépendance à des
 * données préexistantes, fixtures créées et détruites par chaque test.
 *
 * Protection production : SUPABASE_URL n'est lue ici que depuis les variables
 * d'environnement déjà validées par le garde-fou de playwright.config.ts
 * (assertSupabaseUrlIsLocal) — ce fichier ne fait aucune vérification
 * supplémentaire, il fait confiance à ce garde-fou déjà exécuté avant que
 * Playwright ne charge le moindre test.
 */
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const SERVICE_KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;

export const SUPABASE_TESTS_READY = !!ANON_KEY && !!SERVICE_KEY;
export const SUPABASE_TESTS_SKIP_REASON =
  'Variables VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_LOCAL_SERVICE_ROLE_KEY absentes de .env.local — test ignoré (environnement non local).';

export async function adminInsert(request: APIRequestContext, table: string, body: object) {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/${table}`, {
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    data: body,
  });
  expect(res.ok(), `INSERT ${table} a échoué : ${await res.text()}`).toBeTruthy();
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function adminDelete(request: APIRequestContext, table: string, column: string, value: string) {
  await request.delete(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

export async function adminSelect(request: APIRequestContext, table: string, query: string) {
  const res = await request.get(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  expect(res.ok(), `SELECT ${table} a échoué : ${await res.text()}`).toBeTruthy();
  return res.json();
}

/** Crée un utilisateur Auth éphémère + son rôle sur une école, retourne son JWT et son id. */
export async function createTestUser(
  request: APIRequestContext,
  ecoleId: string,
  role: 'admin' | 'directeur' | 'comptable' | 'enseignant' | 'secretaire' = 'admin'
) {
  const email = `test-${randomUUID()}@test.local`;
  const password = 'TestSupabase2026!';
  const createRes = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    data: { email, password, email_confirm: true },
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();
  const userId = (await createRes.json()).id as string;

  await adminInsert(request, 'user_roles', { user_id: userId, ecole_id: ecoleId, role });

  const tokenRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  expect(tokenRes.ok(), await tokenRes.text()).toBeTruthy();
  const { access_token: jwt } = await tokenRes.json();

  return { userId, email, jwt };
}

export async function deleteTestUser(request: APIRequestContext, userId: string) {
  await adminDelete(request, 'user_roles', 'user_id', userId);
  await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

/** Crée une école + année + cycle minimaux pour servir de contexte à des fixtures. */
export async function createEcoleFixture(request: APIRequestContext) {
  const ecole = await adminInsert(request, 'ecoles', { nom: `École Test ${randomUUID().slice(0, 8)}`, code: `T-${randomUUID().slice(0, 8)}` });
  const annee = await adminInsert(request, 'annees_scolaires', {
    ecole_id: ecole.id, libelle: '2026-2027', debut: '2026-09-01', fin: '2027-06-30', statut: 'active',
  });
  const cycle = await adminInsert(request, 'cycles', { ecole_id: ecole.id, nom: 'Primaire', ordre: 1 });
  return { ecoleId: ecole.id as string, anneeId: annee.id as string, cycleId: cycle.id as string };
}

export async function deleteEcoleFixture(request: APIRequestContext, ids: { ecoleId: string; anneeId: string; cycleId: string }) {
  await adminDelete(request, 'cycles', 'id', ids.cycleId);
  await adminDelete(request, 'annees_scolaires', 'id', ids.anneeId);
  await adminDelete(request, 'ecoles', 'id', ids.ecoleId);
}

/** Appelle une RPC PostgREST authentifiée avec un JWT donné. */
export async function callRpc(request: APIRequestContext, jwt: string, fn: string, args: object) {
  return request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    headers: { apikey: ANON_KEY!, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    data: args,
  });
}
