
-- 1. Fix public bucket listing: drop broad SELECT policies (public URL access still works for individual files)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated by default,
-- then GRANT only to roles that legitimately need to call them.

-- Trigger-only functions: revoke from everyone (triggers run as owner)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_promote_on_document() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_promote_on_facture() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_promote_on_classe() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_promote_eleve(uuid) FROM PUBLIC, anon, authenticated;

-- Edge-function-only (service role): revoke from clients
REVOKE ALL ON FUNCTION public.decrypt_sms_api_token(uuid, text) FROM PUBLIC, anon, authenticated;

-- Client RPCs: revoke from public/anon, keep authenticated
REVOKE ALL ON FUNCTION public.check_creneau_overlap(uuid, uuid, uuid, uuid, integer, time, time, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_creneau_overlap(uuid, uuid, uuid, uuid, integer, time, time, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid, uuid) TO authenticated;

-- RLS helpers: must remain executable by authenticated so RLS policies can evaluate them.
-- Move them to a dedicated schema not exposed via PostgREST to silence linter.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- Recreate helpers in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.has_ecole_role(_user_id uuid, _ecole_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND ecole_id = _ecole_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.user_belongs_to_ecole(_user_id uuid, _ecole_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND ecole_id = _ecole_id)
$$;

CREATE OR REPLACE FUNCTION private.get_user_ecole_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ecole_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Grant execute on private helpers to roles that evaluate RLS
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.has_ecole_role(uuid, uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.user_belongs_to_ecole(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_ecole_id() TO authenticated, anon, service_role;

-- Rewire all public RLS policies to use private.* helpers, then drop the public helpers
DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  new_check TEXT;
  cmd TEXT;
  roles_clause TEXT;
BEGIN
  FOR pol IN
    SELECT n.nspname AS schemaname, c.relname AS tablename, p.polname,
           pg_get_expr(p.polqual, p.polrelid) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS withcheck,
           p.polcmd, p.polroles
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public','storage')
      AND (
        pg_get_expr(p.polqual, p.polrelid) ~ '\m(has_role|has_ecole_role|user_belongs_to_ecole|get_user_ecole_id)\M'
        OR pg_get_expr(p.polwithcheck, p.polrelid) ~ '\m(has_role|has_ecole_role|user_belongs_to_ecole|get_user_ecole_id)\M'
      )
  LOOP
    new_qual := pol.qual;
    new_check := pol.withcheck;
    -- Replace bare function calls with private.* prefix
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '(?<![a-zA-Z0-9_.])has_ecole_role\(', 'private.has_ecole_role(', 'g');
      new_qual := regexp_replace(new_qual, '(?<![a-zA-Z0-9_.])has_role\(', 'private.has_role(', 'g');
      new_qual := regexp_replace(new_qual, '(?<![a-zA-Z0-9_.])user_belongs_to_ecole\(', 'private.user_belongs_to_ecole(', 'g');
      new_qual := regexp_replace(new_qual, '(?<![a-zA-Z0-9_.])get_user_ecole_id\(', 'private.get_user_ecole_id(', 'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '(?<![a-zA-Z0-9_.])has_ecole_role\(', 'private.has_ecole_role(', 'g');
      new_check := regexp_replace(new_check, '(?<![a-zA-Z0-9_.])has_role\(', 'private.has_role(', 'g');
      new_check := regexp_replace(new_check, '(?<![a-zA-Z0-9_.])user_belongs_to_ecole\(', 'private.user_belongs_to_ecole(', 'g');
      new_check := regexp_replace(new_check, '(?<![a-zA-Z0-9_.])get_user_ecole_id\(', 'private.get_user_ecole_id(', 'g');
    END IF;

    cmd := CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END;

    -- Build roles clause
    SELECT string_agg(quote_ident(rolname), ', ')
    INTO roles_clause
    FROM pg_roles
    WHERE oid = ANY(pol.polroles);
    IF roles_clause IS NULL THEN roles_clause := 'public'; END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.polname, pol.schemaname, pol.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s%s%s',
      pol.polname, pol.schemaname, pol.tablename, cmd, roles_clause,
      CASE WHEN new_qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END,
      CASE WHEN new_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END
    );
  END LOOP;
END $$;

-- Drop the now-unused public helpers
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_ecole_role(uuid, uuid, public.app_role);
DROP FUNCTION IF EXISTS public.user_belongs_to_ecole(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_ecole_id();
