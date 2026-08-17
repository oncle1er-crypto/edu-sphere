/**
 * Tests RLS — isolation entre écoles. Priorité la plus élevée demandée
 * (« RLS et permissions ») : c'est la ligne de défense qui empêche un
 * utilisateur d'une école de voir ou modifier les données d'une autre.
 * Policies vérifiées dans supabase/migrations/20260501092250_...sql :
 *   ecole_read  : user_belongs_to_ecole(auth.uid(), ecole_id)
 *   ecole_write : has_ecole_role(auth.uid(), ecole_id, 'admin'|'comptable'|'directeur')
 *
 * Chaque test crée SES DEUX écoles + utilisateurs, n'importe rien
 * d'existant, et nettoie tout à la fin (y compris en cas d'échec).
 */
import { test, expect } from '@playwright/test';
import {
  SUPABASE_URL, ANON_KEY, SUPABASE_TESTS_READY, SUPABASE_TESTS_SKIP_REASON,
  adminInsert, adminDelete, createTestUser, deleteTestUser,
  createEcoleFixture, deleteEcoleFixture,
} from './helpers';

test.skip(!SUPABASE_TESTS_READY, SUPABASE_TESTS_SKIP_REASON);

test.describe('RLS — isolation entre écoles', () => {
  test('un admin d\'école A ne peut pas LIRE les élèves de l\'école B', async ({ request }) => {
    const ecoleA = await createEcoleFixture(request);
    const ecoleB = await createEcoleFixture(request);
    const userA = await createTestUser(request, ecoleA.ecoleId, 'admin');
    const eleveB = await adminInsert(request, 'eleves', {
      ecole_id: ecoleB.ecoleId, matricule: `RLS-${Date.now()}`, nom: 'ISOLATION', prenom: 'Test', statut: 'inscrit',
    });

    try {
      const res = await request.get(`${SUPABASE_URL}/rest/v1/eleves?id=eq.${eleveB.id}`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${userA.jwt}` },
      });
      expect(res.ok(), 'la requête elle-même doit réussir (RLS filtre les lignes, ne renvoie pas d\'erreur HTTP)').toBeTruthy();
      const rows = await res.json();
      expect(rows, 'aucune ligne de l\'école B ne doit être visible par un utilisateur de l\'école A').toEqual([]);
    } finally {
      await adminDelete(request, 'eleves', 'id', eleveB.id);
      await deleteTestUser(request, userA.userId);
      await deleteEcoleFixture(request, ecoleA);
      await deleteEcoleFixture(request, ecoleB);
    }
  });

  test('un admin d\'école A ne peut pas ÉCRIRE dans l\'école B (INSERT bloqué par la policy WITH CHECK)', async ({ request }) => {
    const ecoleA = await createEcoleFixture(request);
    const ecoleB = await createEcoleFixture(request);
    const userA = await createTestUser(request, ecoleA.ecoleId, 'admin');

    try {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/eleves`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${userA.jwt}`, 'Content-Type': 'application/json' },
        data: { ecole_id: ecoleB.ecoleId, matricule: `RLS-BLOCKED-${Date.now()}`, nom: 'INTRUSION', prenom: 'Test', statut: 'inscrit' },
      });
      expect(res.ok(), 'l\'insertion dans une autre école doit être refusée par RLS (403/401), jamais réussir').toBeFalsy();
    } finally {
      await deleteTestUser(request, userA.userId);
      await deleteEcoleFixture(request, ecoleA);
      await deleteEcoleFixture(request, ecoleB);
    }
  });

  test('un rôle "enseignant" ne peut pas écrire dans les tranches financières de sa propre école (ecole_write exige admin/comptable)', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const userEnseignant = await createTestUser(request, ecole.ecoleId, 'enseignant');
    const eleve = await adminInsert(request, 'eleves', {
      ecole_id: ecole.ecoleId, matricule: `RLS-ROLE-${Date.now()}`, nom: 'ROLETEST', prenom: 'X', statut: 'inscrit',
    });
    const frais = await adminInsert(request, 'frais_scolarite', {
      ecole_id: ecole.ecoleId, annee_id: ecole.anneeId, cycle_id: ecole.cycleId,
      libelle: 'Scolarité', montant_annuel: 10000, nb_tranches: 1,
    });

    try {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/tranches`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${userEnseignant.jwt}`, 'Content-Type': 'application/json' },
        data: {
          ecole_id: ecole.ecoleId, eleve_id: eleve.id, frais_id: frais.id,
          numero: 1, label: 'Tranche', echeance: '2026-12-31', montant: 10000, paye: 0, statut: 'due',
        },
      });
      expect(res.ok(), 'un enseignant ne doit pas pouvoir créer une tranche financière (policy ecole_write: admin/comptable/directeur)').toBeFalsy();
    } finally {
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, userEnseignant.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('un utilisateur non authentifié (clé anonyme seule) ne peut lire aucun élève', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const eleve = await adminInsert(request, 'eleves', {
      ecole_id: ecole.ecoleId, matricule: `RLS-ANON-${Date.now()}`, nom: 'ANONTEST', prenom: 'X', statut: 'inscrit',
    });
    try {
      const res = await request.get(`${SUPABASE_URL}/rest/v1/eleves?id=eq.${eleve.id}`, {
        headers: { apikey: ANON_KEY! }, // pas d'Authorization Bearer -> rôle "anon", pas "authenticated"
      });
      expect(res.ok()).toBeTruthy();
      const rows = await res.json();
      expect(rows, 'les policies ciblent "TO authenticated" : un accès anonyme ne doit rien voir').toEqual([]);
    } finally {
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteEcoleFixture(request, ecole);
    }
  });
});
