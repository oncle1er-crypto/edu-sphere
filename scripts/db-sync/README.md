# Rafraîchissement des données locales depuis la production

Procédure pour repeupler la base Supabase **locale** avec les données réelles
de production, quand celle-ci a été vidée (ex: après `supabase db reset`).

## Contexte important

La production de ce projet est hébergée sur **Lovable Cloud**, pas sur un
projet Supabase classique. Conséquence vérifiée (documentation officielle
Supabase) : `supabase link` **ne fonctionne pas** avec ce projet — il n'y a
pas d'accès direct via le compte Supabase de l'utilisateur.

Le seul chemin d'accès en lecture (et écriture, à éviter) à la production est
l'outil `query_database` du connecteur Lovable Cloud MCP, disponible
uniquement dans une session Claude connectée à ce workspace.

- Project ID Lovable Cloud (pour `query_database`) : `6f805f54-a1f4-4f1c-94e5-b0e67e3224c1`
  (nom `gs-laprovidence`, workspace `Frederic's Lovable`). Ce n'est pas un
  secret — l'accès réel dépend de l'authentification du connecteur, pas de
  cet identifiant.
- École de production : `Complexe Scolaire La Providence`, id
  `a0000000-0000-0000-0000-000000000001`.

Ce dépôt suit le principe **LOCAL FIRST** (voir `CLAUDE.md`) : cette
procédure ne doit **jamais** écrire dans la production. Toutes les requêtes
`query_database` documentées ici sont des `SELECT` en lecture seule.

## Procédure complète

### Étape 0 — Vérifier qu'il n'y a pas de dérive de schéma

Une modification de schéma faite directement en prod (par Lovable ou
manuellement) sans migration correspondante casse le rechargement de données,
parfois **silencieusement** (voir `json_to_sql.mjs`). À faire avant tout
rechargement :

```sql
-- Côté prod (via query_database, project_id ci-dessus) ET côté local (via psql) :
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Sauvegarder les deux résultats en JSON, puis :

```sh
node scripts/db-sync/schema_diff.mjs schema_prod.json schema_local.json
```

Si une dérive bloquante est signalée (table ou colonne manquante côté
local, ou type/nullabilité différents) : **ne pas continuer**. Écrire une
migration locale (`supabase/migrations/...sql`) qui aligne le schéma local
sur la prod, la valider avec `supabase db reset`, la faire relire avant de
poursuivre.

### Étape 0.5 — Vérifier la parité des volumes de données

Un schéma identique n'exclut pas des données manquantes (lot de sync oublié,
table jamais incluse, échec silencieux). Comparer un comptage exhaustif,
pas un sondage sur quelques tables :

```sql
-- Côté prod ET côté local, même requête :
SELECT table_name,
  (xpath('/row/cnt/text()', query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', table_name), false, true, '')))[1]::text::bigint AS row_count
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY table_name;
```

Sauvegarder le résultat prod en JSON, le résultat local en texte
`table_name|count` (une paire par ligne, `psql -F'|'`), puis :

```sh
node scripts/db-sync/row_count_diff.mjs prod_counts.json local_counts.txt
```

Tout écart doit être expliqué avant de continuer : nouvelle activité prod
pendant la fenêtre de sync (bénin) vs table jamais chargée (à corriger).

### Étapes 1-4 — Charger les données

Pour chaque lot de tables (découper en lots pour rester sous la limite de
taille de réponse de l'outil ; un lot trop gros est de toute façon
auto-sauvegardé en fichier par l'outil, exploitable directement) :

```sql
-- Exemple, adapter la liste de tables :
SELECT jsonb_build_object(
  'eleves', (SELECT jsonb_agg(t) FROM eleves t),
  'parents', (SELECT jsonb_agg(t) FROM parents t)
  -- ... une clé par table du lot
) AS out;
```

Puis, sur le fichier résultat (`.txt` JSON, brut ou auto-sauvegardé) :

```sh
node scripts/db-sync/json_to_sql.mjs resultat_lot.txt lot.sql
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  -v ON_ERROR_STOP=1 \
  -c 'SET session_replication_role = replica;' \
  -f lot.sql
```

`session_replication_role = replica` désactive les triggers (donc les
vérifications de FK par trigger) pour permettre un chargement dans un ordre
arbitraire. Il **ne désactive pas** les contraintes PRIMARY KEY / UNIQUE /
NOT NULL (contraintes d'index, pas de trigger) — d'où l'étape 0.

### Étape 5 — Compte de connexion local

`auth.users` n'est **jamais** synchronisé (table sensible, volontairement
exclue de `query_database`). `profiles`/`user_roles` importés référencent
donc des comptes qui n'existent pas localement : personne ne peut se
connecter tant qu'un compte n'est pas recréé manuellement.

```sh
curl -s -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
  -H "apikey: $SUPABASE_LOCAL_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_LOCAL_SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test.local@laprovidence.dev","password":"TestLocal2026!","email_confirm":true}'
```

Puis lier ce compte à l'école de production réelle :

```sql
UPDATE profiles SET ecole_id = 'a0000000-0000-0000-0000-000000000001' WHERE id = '<user_id>';
INSERT INTO user_roles (user_id, ecole_id, role) VALUES ('<user_id>', 'a0000000-0000-0000-0000-000000000001', 'admin');
```

## Limites connues de ce pipeline

- Il synchronise des **données**, jamais le **schéma** — voir étape 0.
- `auth.users` n'est jamais synchronisé — voir étape 5.
- Il ne tourne que dans une session Claude connectée au workspace Lovable
  Cloud (dépend de `query_database`) : ce n'est pas un script autonome
  exécutable par un humain sans cet outil.
