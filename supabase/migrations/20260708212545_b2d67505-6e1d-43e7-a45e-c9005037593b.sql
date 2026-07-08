
-- Tighten eleves avatars policies: require admin/directeur/enseignant role (not just any ecole member)
DROP POLICY IF EXISTS "Members upload eleves avatars" ON storage.objects;
DROP POLICY IF EXISTS "Members update eleves avatars" ON storage.objects;
DROP POLICY IF EXISTS "Members delete eleves avatars" ON storage.objects;

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

-- Add UPDATE/DELETE policies for the bulletins bucket, restricted to admin/directeur
CREATE POLICY "bulletins_storage_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'bulletins'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.ecole_id)::text = (storage.foldername(objects.name))[1]
      AND ur.role IN ('admin'::app_role, 'directeur'::app_role)
  )
);

CREATE POLICY "bulletins_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'bulletins'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.ecole_id)::text = (storage.foldername(objects.name))[1]
      AND ur.role IN ('admin'::app_role, 'directeur'::app_role)
  )
);
