
-- 1) Fix mutable search_path on our public functions
--
-- Rendu conditionnel pour permettre une reconstruction depuis une base vierge.
--
-- Les 5 fonctions SIGFNE sont désormais créées par la migration de réparation
-- 20260703070731 : elles existent donc bien à ce stade et reçoivent leur
-- search_path normalement.
--
-- Le garde-fou reste nécessaire pour cloturer_et_basculer_annee, qui n'est
-- créée qu'en 20260705224256, soit APRÈS cette migration : l'ordre d'origine
-- n'est valide que sur la base de production, où la fonction préexistait.
-- 20260706211428 réapplique ce même ALTER une fois la fonction créée :
-- l'intention est donc intégralement préservée.
--
-- En production, toutes ces fonctions existent : le bloc s'exécute à l'identique
-- de la version d'origine. Aucun durcissement de sécurité n'est perdu.
DO $do$
DECLARE
  v_sig text;
BEGIN
  FOREACH v_sig IN ARRAY ARRAY[
    'public.cloturer_et_basculer_annee(uuid, uuid, uuid, boolean)',
    'public.import_matricules_sigfne(uuid, jsonb, boolean)',
    'public.normaliser_etat_civil(text)',
    'public.matricule_valide(uuid, text)',
    'public.trg_eleves_sigfne()',
    'public.stats_conformite_sigfne(uuid)'
  ] LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', v_sig);
    ELSE
      RAISE NOTICE 'search_path non appliqué : % absente de cette base (drift de schéma)', v_sig;
    END IF;
  END LOOP;
END
$do$;

-- 2) Stop broadcasting the full eleves table over Realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'eleves'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.eleves';
  END IF;
END$$;

-- 3) Prevent SMS provider API tokens from being read by the client.
--    Add a non-sensitive display value (last 4 chars) and a boolean flag,
--    then revoke column-level SELECT on api_token from client roles.
ALTER TABLE public.sms_config
  ADD COLUMN IF NOT EXISTS api_token_last4 text,
  ADD COLUMN IF NOT EXISTS has_api_token boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_sms_config_token_meta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.api_token IS NOT NULL AND length(NEW.api_token) > 0 THEN
    NEW.has_api_token := true;
    NEW.api_token_last4 := right(NEW.api_token, 4);
  ELSE
    NEW.has_api_token := false;
    NEW.api_token_last4 := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sms_config_token_meta ON public.sms_config;
CREATE TRIGGER trg_sync_sms_config_token_meta
  BEFORE INSERT OR UPDATE ON public.sms_config
  FOR EACH ROW EXECUTE FUNCTION public.sync_sms_config_token_meta();

UPDATE public.sms_config
SET api_token = api_token
WHERE api_token IS NOT NULL;

REVOKE SELECT (api_token) ON public.sms_config FROM anon, authenticated;
