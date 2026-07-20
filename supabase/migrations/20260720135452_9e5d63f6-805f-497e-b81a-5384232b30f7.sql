
-- Tighten eleves avatars storage policies to verify the specific student exists in the school
-- Path format: eleves/{ecole_id}/{eleve_id}-{timestamp}.jpg

DROP POLICY IF EXISTS "Staff upload eleves avatars" ON storage.objects;
DROP POLICY IF EXISTS "Staff update eleves avatars" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete eleves avatars" ON storage.objects;

CREATE POLICY "Staff upload eleves avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'eleves'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[2])::uuid)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.ecole_id = ((storage.foldername(name))[2])::uuid
      AND ur.role IN ('admin'::app_role, 'directeur'::app_role, 'enseignant'::app_role, 'secretaire'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.eleves e
    WHERE e.ecole_id = ((storage.foldername(name))[2])::uuid
      AND split_part(split_part((storage.filename(name)), '-', 1), '.', 1) = e.id::text
  )
);

CREATE POLICY "Staff update eleves avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'eleves'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[2])::uuid)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.ecole_id = ((storage.foldername(name))[2])::uuid
      AND ur.role IN ('admin'::app_role, 'directeur'::app_role, 'enseignant'::app_role, 'secretaire'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.eleves e
    WHERE e.ecole_id = ((storage.foldername(name))[2])::uuid
      AND split_part(split_part((storage.filename(name)), '-', 1), '.', 1) = e.id::text
  )
);

CREATE POLICY "Staff delete eleves avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'eleves'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[2])::uuid)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.ecole_id = ((storage.foldername(name))[2])::uuid
      AND ur.role IN ('admin'::app_role, 'directeur'::app_role)
  )
);
