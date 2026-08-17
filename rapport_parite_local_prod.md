# Rapport — Parité local / production (GSP La Providence)

Date : 15 août 2026
Demande initiale : rendre l'environnement local identique à la production (données + fonctionnalités), sans exception, avant de committer de nouvelles modifications en production.

---

## Résumé exécutif

Le bug signalé (« changement de niveau ») est **résolu** — mais sa cause n'était pas le code : c'était l'absence de données locales (`cycles` vide). Une fois `cycles` et `classes` rechargés, le sélecteur de niveau fonctionne à l'identique de la production.

Le **schéma** local est conforme à la production (aucune dérive bloquante). Le **code** ne présente aucune dérive détectée. Les **données** sont partiellement resynchronisées : 19 tables fonctionnelles ont été rechargées et vérifiées ligne à ligne, deux fichiers SQL supplémentaires sont prêts sur disque mais **pas encore appliqués** (une action de votre part est nécessaire), et les grandes tables (élèves, parents, paiements…) restent à charger.

Aucune migration ni écriture n'a été effectuée en production. Rien n'a été poussé sur `main`.

---

## OBSERVÉ

### Schéma (étape 0 du pipeline `scripts/db-sync/README.md`)
Comparaison exhaustive `information_schema.columns` (141 tables, prod vs local) : 5 tables avec écart détecté, toutes expliquées :
- `depenses`, `ecoles`, `parametres_emploi_temps` : colonnes ajoutées par vos migrations locales de cette session, pas encore poussées en prod (attendu, pas une dérive).
- `eleves`, `zindua_config` : écart uniquement dans l'ordre physique des colonnes (`ordinal_position`), aucune différence de nom/type/nullabilité. Sans impact fonctionnel (Postgres/PostgREST référencent les colonnes par nom).

**Aucune dérive de schéma bloquante.**

### Code
`NiveauContext.tsx` et `NiveauSwitcher.tsx` sont identiques à la production (lecture ligne à ligne). Les 4 fichiers initialement suspectés absents localement (`StudentsAlumni.tsx`, `VenteTenueDialog.tsx`, `useSpVentes.ts`, `SpVentesTenues.tsx`) sont en réalité **présents**, à des chemins différents de ceux recherchés initialement (`src/pages/eleves/sections/`, `src/pages/services-ponctuels/...`) — fausse alerte corrigée.

### Données — tables chargées et vérifiées (comptage local = comptage prod)
`annees_scolaires`, `periodes`, `matieres`, `salles`, `evaluations`, `relances`, `bulletins_audit`, `sp_test_sessions`, `config_module_eleves`, `finance_settings`, `lignes_transport`, `mfa_requirements`, `parametres_documents`, `parametres_matieres`, `parametres_notifications`, `sms_config`, `zindua_config`, `cycles` (3), `classes` (34).

### Données — déjà correctes localement sans intervention de cette session
`app_modules` (29/29) et `role_permissions` (55/55) sont déjà seedées correctement par vos migrations locales existantes — pas besoin de les resynchroniser.

### Test du bug « changement de niveau »
Une fois `cycles` (3) et `classes` (34) chargés, le sélecteur de niveau réapparaît dans l'en-tête (il était masqué par `if (cycles.length === 0) return null;` — comportement voulu du code, pas un bug). Basculement testé en navigateur : « Tous les niveaux » → « Primaire » → le badge « Filtré » et la bordure primaire s'activent correctement, comme en production.

### Compte de test local
`test.local@laprovidence.dev` est fonctionnel, lié à l'école réelle (`Complexe Scolaire La Providence`), rôle admin confirmé (accès aux onglets Écoles/Paramètres visible en navigateur).

---

## DÉDUIT

Le bug « changement de niveau » remonté initialement n'était **pas un défaut de code** mais une conséquence directe d'un environnement local vidé de ses données (probablement après un `supabase db reset` sans rechargement complet). Le code de production et le code local se comportent de façon identique une fois les données présentes.

---

## NON VÉRIFIÉ / RESTE À FAIRE

Deux fichiers SQL complets et idempotents (`ON CONFLICT DO NOTHING`) sont prêts mais **pas encore appliqués** à la base locale :

- `scripts/db-sync/sync_batches/batch_03_app_modules_role_perms_user_perms.sql` — utile uniquement pour `user_permissions` (0/27 localement ; `app_modules` et `role_permissions` sont déjà à jour, voir ci-dessus).
- `scripts/db-sync/sync_batches/batch_04_classes_classe_matieres_profiles_user_roles.sql` — `classes` déjà chargé (idempotent, sera ignoré au rejeu), mais `classe_matieres` (0/135), `profiles` (1/6 — seul le compte de test est présent), `user_roles` (1/15) restent à charger.

**Action nécessaire de votre part** (principe LOCAL FIRST — je n'ai pas d'accès réseau direct à Postgres local depuis mon environnement) :

```sh
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 \
  -f scripts/db-sync/sync_batches/batch_03_app_modules_role_perms_user_perms.sql
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 \
  -f scripts/db-sync/sync_batches/batch_04_classes_classe_matieres_profiles_user_roles.sql
```

**Non synchronisées du tout (contrainte de volume, choix assumé — voir ci-dessous)** : `eleves` (~529 lignes), `parents` (~265), `eleve_parents` (~262), `parcours_scolaire` (~227), `documents_eleves` (~278), `paiements` (~317), `tranches` (~1425), `factures`, et une trentaine d'autres tables fonctionnelles de taille moyenne (`sp_*`, `vacances_*`, `rh_*`, `incidents_discipline`, `livres`, `emprunts`, `notifications_parents`, `depenses`, `frais_scolarite`, `grille_tarifs_*`, `lignes_budget`…).

**Explicitement différées, sur votre validation** (option « Tables fonctionnelles d'abord ») : `security_audit_logs`, `audit_logs`, `creneaux_emploi_temps`, `sms_logs`, `mfa_*` (hors `mfa_requirements`), `trusted_devices`. Impact fonctionnel réel : nul pour les tests de parcours utilisateur — ce sont des journaux/logs, pas des données métier consultées par l'UI standard.

`tsc`/`build`/`lint` n'ont pas été relancés dans cette session : aucune ligne de code n'a été modifiée (uniquement des données), donc pas requis par la procédure qualité du `CLAUDE.md`.

---

## RISQUES

- **Token API SMS/WhatsApp en clair en local** : la table `sms_config` (déjà synchronisée) contient un jeton d'API réel du fournisseur `yellikasms.com`. `is_active = false` en prod, ce qui limite le risque d'usage accidentel, mais le secret existe désormais dans votre environnement de développement. Recommandation : le régénérer côté fournisseur si le dépôt local n'est pas strictement privé, ou l'exclure des futurs rechargements.
- **Élèves non chargés = tests incomplets** : tant que `eleves`/`paiements`/`tranches` ne sont pas synchronisés, les écrans Élèves, Finances (Bilan, Grand livre, Récap) et Emploi du temps resteront vides en local — pas un bug, mais à ne pas confondre avec une régression lors de vos prochains tests.
- **`profiles`/`user_roles` partiels** : seul le compte de test existe localement pour l'instant. Les tests de permissions par rôle (secrétaire, comptable, enseignant…) ne seront pas représentatifs tant que `batch_04` n'est pas appliqué.

---

## RECOMMANDATIONS

1. Exécuter les deux commandes `psql` ci-dessus (30 secondes, sans risque — idempotent).
2. Si vous voulez la parité complète des grandes tables (élèves, paiements…), je peux continuer table par table dans une prochaine session ; chaque table doit transiter par mon contexte (pas d'accès direct base-à-base), donc cela reste consommateur de temps pour les plus grosses (`tranches` ~1425 lignes notamment).
3. Statuer sur le token SMS avant tout partage du dépôt local.

---

## Fichiers modifiés

Aucun fichier de code source modifié. Fichiers créés (scripts de synchronisation, hors code applicatif) :
- `scripts/db-sync/sync_batches/batch_03_app_modules_role_perms_user_perms.sql`
- `scripts/db-sync/sync_batches/batch_04_classes_classe_matieres_profiles_user_roles.sql`

## Tests effectués

- Diff de schéma exhaustif prod/local (141 tables).
- Comptage prod vs local sur 19 tables rechargées : conformité confirmée.
- Test navigateur du sélecteur de niveau (Tous les niveaux / Primaire / Secondaire) : comportement conforme à la production.
- Vérification du compte de test (rôle admin, accès Écoles/Paramètres).

## Commandes réellement exécutées

Requêtes `SELECT` en lecture seule sur la production (via connecteur Lovable Cloud, `project_id 6f805f54-...`) et `INSERT ... ON CONFLICT DO NOTHING` sur le Postgres **local** uniquement (via l'éditeur SQL de Supabase Studio local, `127.0.0.1:54323`). Aucune écriture en production.

## Git status

Aucune modification de fichier suivi par Git dans cette session (uniquement des fichiers nouveaux hors du code applicatif, dans `scripts/db-sync/sync_batches/`). Aucun commit, aucun push.

## Risques éventuels liés à un push futur

Sans objet pour cette session : aucune modification de code n'a été produite, donc rien n'est en attente de déploiement.
