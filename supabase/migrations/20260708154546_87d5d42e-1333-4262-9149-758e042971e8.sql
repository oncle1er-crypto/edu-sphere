
CREATE POLICY "contrats_docs_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contrats-enseignants'
    AND (
      private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::app_role)
      OR private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'directeur'::app_role)
      OR private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'comptable'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.enseignants e
        WHERE e.id = (storage.foldername(name))[2]::uuid AND e.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contrats_docs_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contrats-enseignants'
    AND (
      private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::app_role)
      OR private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'directeur'::app_role)
    )
  );

CREATE POLICY "contrats_docs_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contrats-enseignants'
    AND private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::app_role)
  );
