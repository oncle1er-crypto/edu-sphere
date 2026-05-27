-- 1) Retirer security_audit_logs de la publication realtime (consomm\u00e9 par polling, pas par souscription)
ALTER PUBLICATION supabase_realtime DROP TABLE public.security_audit_logs;

-- 2) Politique SELECT explicite pour le bucket logos (rend l'intention publique explicite et auditable)
DROP POLICY IF EXISTS "Logos publicly readable" ON storage.objects;
CREATE POLICY "Logos publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');