/**
 * Test de non-régression — bug critique corrigé le 10/08/2026 (audit module Paiements).
 *
 * Contexte : la fonction trigger `reconcilier_tranche_paiements()` recalculait
 * `tranches.paye` en sommant TOUS les paiements liés à la tranche, sans exclure
 * les paiements annulés (`annule_le`). Conséquence : après l'annulation d'un
 * encaissement ou d'une remise, la tranche restait comptée comme payée pour le
 * montant annulé.
 *
 * Ce test reproduit le cycle complet (remise → annulation → vérification du
 * solde) directement contre l'API locale, sans dépendre de données existantes :
 * il crée sa propre école/élève/tranche de test et nettoie tout à la fin.
 *
 * Ne s'exécute que contre une instance Supabase LOCALE (127.0.0.1:54321).
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'crypto';

// Lues depuis .env.local (chargé par playwright.config.ts) : ce sont des valeurs
// fixes de la stack Supabase LOCALE (pas des secrets de production), gardées
// hors du code source par principe — voir .env.local pour le détail.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const SECRET_KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!;

test.skip(!ANON_KEY || !SECRET_KEY, 'Variables VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_LOCAL_SERVICE_ROLE_KEY absentes de .env.local — test ignoré (environnement non local).');

async function adminInsert(request: APIRequestContext, table: string, body: object) {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/${table}`, {
    headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    data: body,
  });
  expect(res.ok(), `INSERT ${table} a échoué : ${await res.text()}`).toBeTruthy();
}

async function adminDelete(request: APIRequestContext, table: string, column: string, value: string) {
  await request.delete(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
    headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
  });
}

test('Annulation d\'une remise : le solde de la tranche redescend correctement', async ({ request }) => {
  const ecoleId = randomUUID();
  const anneeId = randomUUID();
  const cycleId = randomUUID();
  const eleveId = randomUUID();
  const frId = randomUUID();
  const trId = randomUUID();
  let userId: string | null = null;

  try {
    // ---- Fixture minimale ----
    await adminInsert(request, 'ecoles', { id: ecoleId, nom: 'École Test Régression', code: `REG-${ecoleId.slice(0, 8)}` });
    await adminInsert(request, 'annees_scolaires', {
      id: anneeId, ecole_id: ecoleId, libelle: '2026-2027', debut: '2026-09-01', fin: '2027-06-30', statut: 'active',
    });
    await adminInsert(request, 'cycles', { id: cycleId, ecole_id: ecoleId, nom: 'Primaire', ordre: 1 });
    await adminInsert(request, 'frais_scolarite', {
      id: frId, ecole_id: ecoleId, annee_id: anneeId, cycle_id: cycleId,
      libelle: 'Scolarité', montant_annuel: 30000, nb_tranches: 1,
    });
    await adminInsert(request, 'eleves', {
      id: eleveId, ecole_id: ecoleId, matricule: `REG-${eleveId.slice(0, 8)}`,
      nom: 'REGRESSION', prenom: 'Test', statut: 'inscrit',
    });
    await adminInsert(request, 'tranches', {
      id: trId, ecole_id: ecoleId, eleve_id: eleveId, frais_id: frId,
      numero: 1, label: 'Tranche unique', echeance: '2026-12-31', montant: 30000, paye: 0, statut: 'due',
    });

    // Utilisateur admin éphémère pour appeler les RPC (SECURITY DEFINER + auth.uid()).
    const email = `regression-${randomUUID()}@test.local`;
    const password = 'RegressionTest2026!';
    const createUserRes = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' },
      data: { email, password, email_confirm: true },
    });
    expect(createUserRes.ok()).toBeTruthy();
    userId = (await createUserRes.json()).id;
    await adminInsert(request, 'user_roles', { user_id: userId, ecole_id: ecoleId, role: 'admin' });

    const tokenRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      data: { email, password },
    });
    const { access_token: jwt } = await tokenRes.json();

    // ---- 1) Appliquer une remise de 12 000 FCFA ----
    const remiseRes = await request.post(`${SUPABASE_URL}/rest/v1/rpc/appliquer_remise`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      data: {
        _ecole_id: ecoleId, _eleve_id: eleveId, _tranche_id: trId,
        _montant: 12000, _type_remise: 'bourse', _motif: 'Fixture test non-régression', _accorde_par: userId,
      },
    });
    expect(remiseRes.ok(), await remiseRes.text()).toBeTruthy();
    const paiementId = (await remiseRes.json()) as string;

    const afterRemise = await request.get(`${SUPABASE_URL}/rest/v1/tranches?id=eq.${trId}&select=paye,statut`, {
      headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
    });
    const [trancheAfterRemise] = await afterRemise.json();
    expect(trancheAfterRemise.paye).toBe(12000);
    expect(trancheAfterRemise.statut).toBe('partielle');

    // ---- 2) Annuler cette remise ----
    const cancelRes = await request.post(`${SUPABASE_URL}/rest/v1/rpc/annuler_paiement_scolarite`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      data: { _paiement_id: paiementId, _motif: 'Annulation de contrôle — test non-régression' },
    });
    expect(cancelRes.ok(), await cancelRes.text()).toBeTruthy();
    const cancelBody = await cancelRes.json();

    // ---- 3) Vérifier que le solde est bien revenu à 0 (régression du bug corrigé) ----
    expect(cancelBody.nouveau_paye_tranche, 'La RPC doit renvoyer 0 après annulation').toBe(0);

    const afterCancel = await request.get(`${SUPABASE_URL}/rest/v1/tranches?id=eq.${trId}&select=paye,statut`, {
      headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
    });
    const [trancheAfterCancel] = await afterCancel.json();
    expect(trancheAfterCancel.paye, 'tranches.paye doit revenir à 0 après annulation du seul paiement').toBe(0);
    expect(trancheAfterCancel.statut, 'le statut doit revenir à "due" après annulation').toBe('due');
  } finally {
    // ---- Nettoyage complet (best-effort, ne doit pas faire échouer le test) ----
    await adminDelete(request, 'tranches', 'id', trId);
    await adminDelete(request, 'eleves', 'id', eleveId);
    await adminDelete(request, 'frais_scolarite', 'id', frId);
    await adminDelete(request, 'cycles', 'id', cycleId);
    await adminDelete(request, 'annees_scolaires', 'id', anneeId);
    await adminDelete(request, 'ecoles', 'id', ecoleId);
    if (userId) {
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
      });
    }
  }
});
