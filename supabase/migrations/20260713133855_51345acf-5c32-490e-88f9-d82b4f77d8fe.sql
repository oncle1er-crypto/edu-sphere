-- 1) Messages: add ecole scoping for defense in depth
DROP POLICY IF EXISTS own_messages_read ON public.messages;
CREATE POLICY own_messages_read ON public.messages
FOR SELECT TO authenticated
USING (
  ((expediteur_id = auth.uid()) OR (destinataire_id = auth.uid()))
  AND private.user_belongs_to_ecole(auth.uid(), ecole_id)
);

-- 2) sms_config: revoke SELECT on the raw api_token column from client roles.
-- INSERT/UPDATE remain granted so admins can still save a new token.
REVOKE SELECT (api_token) ON public.sms_config FROM authenticated;
REVOKE SELECT (api_token) ON public.sms_config FROM anon;