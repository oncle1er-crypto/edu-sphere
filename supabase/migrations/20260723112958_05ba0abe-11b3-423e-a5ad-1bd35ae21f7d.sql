
DROP POLICY IF EXISTS "ecole_write" ON public.documents_eleves;
CREATE POLICY "ecole_write" ON public.documents_eleves
  AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role));

DROP POLICY IF EXISTS "ecole_write" ON public.exigences_documents_eleves;
CREATE POLICY "ecole_write" ON public.exigences_documents_eleves
  AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role));

DROP POLICY IF EXISTS "Staff can upload documents" ON storage.objects;
CREATE POLICY "Staff can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'documents-eleves'::text) AND (private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)));

DROP POLICY IF EXISTS "Staff can update documents" ON storage.objects;
CREATE POLICY "Staff can update documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING ((bucket_id = 'documents-eleves'::text) AND (private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)));

DROP POLICY IF EXISTS "Staff can delete documents" ON storage.objects;
CREATE POLICY "Staff can delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING ((bucket_id = 'documents-eleves'::text) AND (private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role) OR private.has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'secretaire'::app_role)));
