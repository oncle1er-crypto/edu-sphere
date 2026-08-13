/**
 * Tests ciblés sur les RPC financières critiques (appliquer_remise,
 * annuler_paiement_scolarite) et le garde-fou trg_paiements_invariants.
 * Complète tests/e2e/paiements-annulation-solde.spec.ts (qui couvre déjà le
 * cycle remise -> annulation -> solde), en se concentrant ici sur les
 * validations et cas d'erreur de chaque fonction — lus directement dans
 * supabase/migrations/20260525183039_...sql et
 * supabase/migrations/20260807120448_local_repair_schema_drift_2.sql.
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  SUPABASE_URL, ANON_KEY, SUPABASE_TESTS_READY, SUPABASE_TESTS_SKIP_REASON,
  adminInsert, adminDelete, adminSelect, createTestUser, deleteTestUser,
  createEcoleFixture, deleteEcoleFixture, callRpc,
} from './helpers';

test.skip(!SUPABASE_TESTS_READY, SUPABASE_TESTS_SKIP_REASON);

async function makeTrancheFixture(request: APIRequestContext, ecole: { ecoleId: string; anneeId: string; cycleId: string }, montant = 10000) {
  const eleve = await adminInsert(request, 'eleves', {
    ecole_id: ecole.ecoleId, matricule: `RPC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nom: 'RPCTEST', prenom: 'Fixture', statut: 'inscrit',
  });
  const frais = await adminInsert(request, 'frais_scolarite', {
    ecole_id: ecole.ecoleId, annee_id: ecole.anneeId, cycle_id: ecole.cycleId,
    libelle: 'Scolarité', montant_annuel: montant, nb_tranches: 1,
  });
  const tranche = await adminInsert(request, 'tranches', {
    ecole_id: ecole.ecoleId, eleve_id: eleve.id, frais_id: frais.id,
    numero: 1, label: 'Tranche unique', echeance: '2026-12-31', montant, paye: 0, statut: 'due',
  });
  return { eleve, frais, tranche };
}

test.describe('appliquer_remise — validations', () => {
  test('refuse un motif absent ou trop court', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole);
    try {
      const res = await callRpc(request, user.jwt, 'appliquer_remise', {
        _ecole_id: ecole.ecoleId, _eleve_id: eleve.id, _tranche_id: tranche.id,
        _montant: 1000, _type_remise: 'bourse', _motif: 'ab',
      });
      expect(res.ok(), 'un motif de 2 caractères doit être refusé (minimum 3)').toBeFalsy();
      const body = await res.text();
      expect(body).toContain('motif');
    } finally {
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('refuse un montant nul ou négatif', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole);
    try {
      const res = await callRpc(request, user.jwt, 'appliquer_remise', {
        _ecole_id: ecole.ecoleId, _eleve_id: eleve.id, _tranche_id: tranche.id,
        _montant: 0, _type_remise: 'bourse', _motif: 'Motif suffisamment long',
      });
      expect(res.ok()).toBeFalsy();
    } finally {
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('refuse une remise qui dépasserait le reste dû', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole, 10000);
    try {
      const res = await callRpc(request, user.jwt, 'appliquer_remise', {
        _ecole_id: ecole.ecoleId, _eleve_id: eleve.id, _tranche_id: tranche.id,
        _montant: 10001, _type_remise: 'bourse', _motif: 'Dépasse le montant de la tranche',
      });
      expect(res.ok(), 'une remise supérieure au montant de la tranche doit être refusée').toBeFalsy();
    } finally {
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('un enseignant (rôle insuffisant) ne peut pas accorder de remise', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const userEnseignant = await createTestUser(request, ecole.ecoleId, 'enseignant');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole);
    try {
      const res = await callRpc(request, userEnseignant.jwt, 'appliquer_remise', {
        _ecole_id: ecole.ecoleId, _eleve_id: eleve.id, _tranche_id: tranche.id,
        _montant: 1000, _type_remise: 'bourse', _motif: 'Motif suffisamment long',
      });
      expect(res.ok(), 'appliquer_remise exige admin/directeur/comptable').toBeFalsy();
    } finally {
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, userEnseignant.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  // BUG APPLICATION corrigé le 13/08/2026 (voir migration
  // 20260813090000_fix_appliquer_remise_exclude_annules.sql) : ce test
  // échouait avant la correction, car appliquer_remise incluait à tort les
  // paiements annulés dans son calcul du reste dû.
  test('une remise redevient possible après annulation d\'un paiement qui bloquait le reste dû', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole, 10000);
    let paiementId: string | null = null;
    try {
      // 1) Encaisse 6000 sur la tranche (paiement direct, respecte trg_paiements_invariants).
      const paiement = await adminInsert(request, 'paiements', {
        ecole_id: ecole.ecoleId, eleve_id: eleve.id, tranche_id: tranche.id,
        montant: 6000, mode: 'especes',
      });
      paiementId = paiement.id;

      // 2) Annule ce paiement.
      const cancelRes = await callRpc(request, user.jwt, 'annuler_paiement_scolarite', {
        _paiement_id: paiementId, _motif: 'Annulation de contrôle — test RPC',
      });
      expect(cancelRes.ok(), await cancelRes.text()).toBeTruthy();

      // 3) Le reste dû réel est donc redevenu 10000 (paye=0 après annulation) :
      // une remise de 8000 doit maintenant être acceptée.
      const remiseRes = await callRpc(request, user.jwt, 'appliquer_remise', {
        _ecole_id: ecole.ecoleId, _eleve_id: eleve.id, _tranche_id: tranche.id,
        _montant: 8000, _type_remise: 'bourse', _motif: 'Remise après annulation du paiement précédent',
      });
      expect(
        remiseRes.ok(),
        `la remise doit être acceptée (reste dû réel = 10000 après annulation) : ${await remiseRes.text()}`
      ).toBeTruthy();
    } finally {
      if (paiementId) await adminDelete(request, 'paiements', 'id', paiementId);
      const remises = (await adminSelect(request, 'paiements', `tranche_id=eq.${tranche.id}`)) as Array<{ id: string }>;
      for (const r of remises) await adminDelete(request, 'paiements', 'id', r.id);
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });
});

test.describe('annuler_paiement_scolarite — validations', () => {
  test('refuse d\'annuler un paiement déjà annulé', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole);
    const paiement = await adminInsert(request, 'paiements', {
      ecole_id: ecole.ecoleId, eleve_id: eleve.id, tranche_id: tranche.id, montant: 1000, mode: 'especes',
    });
    try {
      const first = await callRpc(request, user.jwt, 'annuler_paiement_scolarite', {
        _paiement_id: paiement.id, _motif: 'Première annulation',
      });
      expect(first.ok(), await first.text()).toBeTruthy();

      const second = await callRpc(request, user.jwt, 'annuler_paiement_scolarite', {
        _paiement_id: paiement.id, _motif: 'Deuxième tentative',
      });
      expect(second.ok(), 'une deuxième annulation du même paiement doit être refusée (deja_annule)').toBeFalsy();
    } finally {
      await adminDelete(request, 'paiements', 'id', paiement.id);
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('refuse un paiement_id inexistant', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    try {
      const res = await callRpc(request, user.jwt, 'annuler_paiement_scolarite', {
        _paiement_id: '00000000-0000-0000-0000-000000000000', _motif: 'Motif quelconque valide',
      });
      expect(res.ok(), 'paiement_introuvable attendu').toBeFalsy();
    } finally {
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('refuse un motif trop court (moins de 5 caractères)', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole);
    const paiement = await adminInsert(request, 'paiements', {
      ecole_id: ecole.ecoleId, eleve_id: eleve.id, tranche_id: tranche.id, montant: 1000, mode: 'especes',
    });
    try {
      const res = await callRpc(request, user.jwt, 'annuler_paiement_scolarite', {
        _paiement_id: paiement.id, _motif: 'abcd', // 4 caractères, minimum 5 requis
      });
      expect(res.ok()).toBeFalsy();
    } finally {
      await adminDelete(request, 'paiements', 'id', paiement.id);
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });
});

test.describe('trg_paiements_invariants — garde-fou anti-surpaiement', () => {
  test('refuse un paiement direct qui dépasserait le montant de la tranche', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole, 5000);
    try {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/paiements`, {
        headers: {
          apikey: ANON_KEY!,
          Authorization: `Bearer ${ANON_KEY}`, // service désactivé volontairement : on veut juste vérifier le trigger, indépendant du rôle
          'Content-Type': 'application/json',
        },
        data: { ecole_id: ecole.ecoleId, eleve_id: eleve.id, tranche_id: tranche.id, montant: 5001, mode: 'especes' },
      });
      // Attendu : soit bloqué par RLS (anon non authentifié), soit par le trigger si RLS l'autorisait.
      // Dans les deux cas, l'insertion ne doit jamais réussir.
      expect(res.ok(), 'un paiement de 5001 sur une tranche de 5000 ne doit jamais être accepté').toBeFalsy();
    } finally {
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteEcoleFixture(request, ecole);
    }
  });

  test('un admin authentifié ne peut pas non plus dépasser le montant de la tranche (le trigger s\'applique à tous les rôles)', async ({ request }) => {
    const ecole = await createEcoleFixture(request);
    const user = await createTestUser(request, ecole.ecoleId, 'admin');
    const { eleve, frais, tranche } = await makeTrancheFixture(request, ecole, 5000);
    try {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/paiements`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${user.jwt}`, 'Content-Type': 'application/json' },
        data: { ecole_id: ecole.ecoleId, eleve_id: eleve.id, tranche_id: tranche.id, montant: 5001, mode: 'especes' },
      });
      expect(res.ok(), 'trg_paiements_invariants doit refuser le surpaiement même pour un admin').toBeFalsy();
    } finally {
      await adminDelete(request, 'tranches', 'id', tranche.id);
      await adminDelete(request, 'frais_scolarite', 'id', frais.id);
      await adminDelete(request, 'eleves', 'id', eleve.id);
      await deleteTestUser(request, user.userId);
      await deleteEcoleFixture(request, ecole);
    }
  });
});
