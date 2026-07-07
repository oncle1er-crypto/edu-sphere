
-- 1. mfa_failed_attempts : retirer la possibilité pour l'utilisateur de modifier son compteur
DROP POLICY IF EXISTS "Users update own failed attempts" ON public.mfa_failed_attempts;

-- Conserver uniquement la lecture par le propriétaire ; les écritures passent par
-- des fonctions SECURITY DEFINER / le service_role (côté serveur uniquement).
REVOKE INSERT, UPDATE, DELETE ON public.mfa_failed_attempts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mfa_failed_attempts FROM anon;
GRANT ALL ON public.mfa_failed_attempts TO service_role;

-- 2. sms_config : la lecture des lignes ne doit être ouverte qu'aux admins
DROP POLICY IF EXISTS "sms_config_select" ON public.sms_config;

CREATE POLICY "sms_config_select_admin_only"
ON public.sms_config
FOR SELECT
TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));
