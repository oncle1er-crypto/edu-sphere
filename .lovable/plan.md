## Plan de correction — Priorité HAUTE

Objectif : traiter les 4 points bloquants/critiques listés dans le rapport, sans toucher au reste de l'application.

---

### 1. Assistant de transition d'année — finaliser les RPC serveur

Créer les 4 fonctions SECURITY DEFINER manquantes (spécifiées dans `.lovable/plan.md`) et brancher l'UI existante (`SchoolsYearTransition.tsx` + `useYearTransition.ts`) dessus.

**Migration SQL** (une seule migration) :

- `promouvoir_eleves_annee(_ecole_id uuid, _annee_source uuid, _annee_cible uuid, _mapping jsonb, _mode text)`
  - Parcourt les élèves actifs de l'année source.
  - Applique les décisions verrouillées de `decisions_fin_annee` (passage / redoublement / exclusion).
  - Pour les élèves sans décision : applique `_mapping` (PS→MS, …, CM2→6ème) selon `_mode` ('auto' ou 'skip').
  - Crée les nouvelles lignes `eleves` pour `annee_id = _annee_cible`, statut `pre_inscrit`, en réutilisant le matricule.
  - Trace dans `parcours_scolaire`.
  - Retourne `jsonb {promus, redoubles, exclus, sans_decision}`.
- `reconduire_affectations_pedagogiques(_ecole_id, _annee_source, _annee_cible, _options jsonb)`
  - Copie `classe_matieres` et/ou `enseignant_matieres` (et optionnellement `creneaux_emploi_temps` si `_options->>'emploi_du_temps' = 'true'`).
  - Ignore les doublons via `ON CONFLICT DO NOTHING`.
- `renouveler_abonnements(_ecole_id, _annee_source, _annee_cible, _types text[])`
  - Duplique `abonnements_cantine` et/ou `abonnements_transport` actifs vers l'année cible.
- `activer_annee_scolaire(_ecole_id, _annee_id)`
  - Passe toutes les autres années de l'école à `verrouillee`, la cible à `active`.

**Sécurité** :
- Chaque fonction vérifie `has_role(auth.uid(), 'admin')` OU `has_role(auth.uid(), 'directeur')` + `user_belongs_to_ecole(auth.uid(), _ecole_id)`.
- `SET search_path = public`, `SECURITY DEFINER`, `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated`.

**Frontend** :
- Mettre à jour `src/hooks/useYearTransition.ts` pour appeler les 4 RPC réelles au lieu des appels partiels actuels.
- Ajouter toasts + rapport final (compteurs renvoyés par chaque RPC).

---

### 2. Empêcher les doublons d'année scolaire

**Migration SQL** :

```
CREATE UNIQUE INDEX IF NOT EXISTS uniq_annees_scolaires_ecole_libelle
  ON public.annees_scolaires (ecole_id, lower(libelle));
```

- Contrainte insensible à la casse.
- Pré-check : détecter les doublons existants avant migration ; si présents, la migration échoue proprement (le user devra nettoyer manuellement — sinon on peut ajouter un suffixe " (doublon)").

**Frontend** :
- Dans le formulaire de création (`SchoolsYearTransition` étape 1 + éventuellement `SchoolsConfig`), intercepter l'erreur `23505` et afficher « Une année scolaire avec ce libellé existe déjà ».

---

### 3. Politique de rôles centralisée — audit RLS/GRANT

Audit systématique des 90+ tables `public.*` pour garantir :
- `ENABLE ROW LEVEL SECURITY` actif partout.
- `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated` (ou plus restreint) + `GRANT ALL ... TO service_role`.
- Toutes les policies data scoped via `private.user_belongs_to_ecole(auth.uid(), ecole_id)` (ou `has_role` pour tables globales).

**Méthode** :
1. Requête d'audit via `supabase--read_query` sur `pg_tables` + `pg_policies` + `information_schema.role_table_grants` pour lister les tables :
   - sans RLS,
   - sans GRANT à `authenticated`/`service_role`,
   - avec policy sans référence à `ecole_id`.
2. Générer un **rapport CSV** (dans `/mnt/documents/`) listant chaque anomalie.
3. Produire **une migration corrective** ajoutant les `GRANT`/`ENABLE RLS`/policies manquantes, table par table.
4. Ne pas modifier les policies déjà correctes.

**Livrable** : 1 rapport + 1 migration de mise en conformité.

---

### 4. Sécurité MFA — service worker PWA

Le SW actuel (`vite.config.ts`) exclut déjà `supabase.co` et `/auth/` du fallback, mais :
- La règle `runtimeCaching` sur Supabase est `NetworkOnly` (OK).
- Ajouter explicitement dans `navigateFallbackDenylist` :
  - `/mfa`, `/parametres/mfa`, `/auth/callback`, `/~oauth`.
- Ajouter une règle `runtimeCaching` `NetworkOnly` pour les endpoints MFA edge functions :
  - `/functions/v1/send-mfa-sms-otp`, `/functions/v1/verify-mfa-sms-otp`, `/functions/v1/admin-reset-password`.
- Vérifier qu'aucun cache `html-navigations` ne stocke les pages `/auth/*` ni `/parametres/mfa` (ajouter un `denylist` sur la règle NetworkFirst).

**Frontend** : ajouter en tête de `src/pwa/registerSW.ts` un `caches.delete('html-navigations')` au premier login réussi pour purger d'éventuels résidus.

---

### Ordre d'exécution recommandé

1. Migration transitions d'année (point 1) + branchement UI.
2. Migration contrainte unique `annees_scolaires` (point 2).
3. Audit RLS/GRANT + migration corrective (point 3).
4. Ajustement `vite.config.ts` + `registerSW.ts` (point 4).

Chaque étape est indépendante et testable isolément. Aucune donnée existante n'est supprimée ; tout est additif ou dédupliqué.

---

### Détails techniques (résumé)

- **Nouveaux fichiers** : 4 migrations SQL (1 par point sauf point 4).
- **Fichiers modifiés** : `src/hooks/useYearTransition.ts`, `src/pages/ecoles/sections/SchoolsYearTransition.tsx` (câblage rapports), `vite.config.ts`, `src/pwa/registerSW.ts`.
- **Aucun changement** sur les autres modules (élèves, finances, examens, etc.).
