CREATE POLICY "recus_storage_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recus'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "recus_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recus'
  AND (
    private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'comptable'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)
  )
);

CREATE POLICY "recus_storage_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recus'
  AND (
    private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'comptable'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)
  )
);

CREATE POLICY "recus_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recus'
  AND (
    private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
  )
);