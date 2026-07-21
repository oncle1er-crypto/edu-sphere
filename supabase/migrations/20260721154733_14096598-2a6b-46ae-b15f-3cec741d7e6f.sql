DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;

CREATE POLICY "Staff can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents-eleves'
  AND (
    private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)
  )
);

CREATE POLICY "Staff can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents-eleves'
  AND (
    private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)
  )
);

CREATE POLICY "Staff can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents-eleves'
  AND (
    private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)
  )
);