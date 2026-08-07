-- =====================================================================
-- SEED LOCAL — alignement des privilèges sur le comportement Supabase hébergé
-- =====================================================================
-- ⚠️  Ce fichier n'est exécuté que par `supabase db reset` / `supabase start`
--     sur la stack LOCALE. Il n'est jamais appliqué par `supabase db push`
--     ni par un déploiement : il ne peut pas atteindre la production.
--
-- Problème résolu
-- ---------------
-- L'image Postgres locale (supabase/postgres:17.6.x) définit DEUX jeux de
-- privilèges par défaut sur le schéma public :
--
--   FOR ROLE supabase_admin : anon/authenticated = arwdDxtm  (complet)
--   FOR ROLE postgres       : anon/authenticated = Dxtm      (TRUNCATE,
--                                                   REFERENCES, TRIGGER,
--                                                   MAINTAIN uniquement)
--
-- Or la CLI applique les migrations en tant que `postgres`. Résultat : toutes
-- les tables créées par les migrations n'ont AUCUN droit SELECT/INSERT/UPDATE/
-- DELETE pour anon et authenticated, et PostgREST répond 401 :
--     42501 — permission denied for table ecoles
--
-- Sur le projet hébergé ces droits existent (tables créées via l'éditeur SQL,
-- donc sous supabase_admin), d'où une application fonctionnelle en production
-- mais totalement bloquée en local. C'est une différence d'ENVIRONNEMENT, pas
-- une erreur des migrations : elle est donc corrigée ici et non dans une
-- migration métier.
--
-- Sécurité
-- --------
-- Ces GRANT ne créent aucune faille : dans le modèle Supabase, la frontière de
-- sécurité réelle est la RLS, active sur les tables du projet avec des
-- politiques ciblant `authenticated`. Un rôle `anon` disposant du GRANT reste
-- bloqué par la RLS, exactement comme en production.
-- =====================================================================

-- 1) Aligner les privilèges par défaut du rôle `postgres` sur ceux de
--    `supabase_admin`, pour toute table/séquence/fonction créée ensuite.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2) Rattraper les objets déjà créés par les 166 migrations.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3) Restaurer les restrictions explicitement voulues par les migrations, que
--    le GRANT global ci-dessus vient d'écraser. Chaque ligne reprend
--    littéralement une instruction de migration ; la référence est indiquée.

-- 20260708200518 : app_modules non lisible par anon
REVOKE SELECT ON public.app_modules FROM anon;

-- 20260707101457 : mfa_failed_attempts en lecture seule côté client
REVOKE INSERT, UPDATE, DELETE ON public.mfa_failed_attempts FROM authenticated, anon;

-- 20260714151018 / 20260708104439 / 20260703070732 / 20260713133855 :
-- le jeton du fournisseur SMS ne doit jamais être lisible ni modifiable
-- depuis le client (seule la colonne api_token est concernée).
--
-- Un REVOKE au niveau colonne est SANS EFFET tant que le rôle détient le
-- privilège au niveau table (PostgreSQL : le droit table couvre toutes les
-- colonnes). Le GRANT ALL global ci-dessus vient précisément d'accorder ce
-- droit table. On retire donc le privilège table, puis on le réaccorde
-- colonne par colonne en excluant api_token.
DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'sms_config'
    AND column_name <> 'api_token';

  EXECUTE 'REVOKE SELECT, INSERT, UPDATE ON public.sms_config FROM authenticated, anon, PUBLIC';
  EXECUTE format('GRANT SELECT (%s) ON public.sms_config TO authenticated', v_cols);
  EXECUTE format('GRANT INSERT (%s) ON public.sms_config TO authenticated', v_cols);
  EXECUTE format('GRANT UPDATE (%s) ON public.sms_config TO authenticated', v_cols);
END $$;
