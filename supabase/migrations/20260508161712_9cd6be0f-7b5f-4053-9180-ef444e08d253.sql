-- Simplifie les policies du bucket "logos" pour permettre à tout membre de l'école d'envoyer/maj le logo
DROP POLICY IF EXISTS "School admins upload logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins update logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins delete logos" ON storage.objects;

-- Lecture publique (le bucket est déjà public, mais on l'explicite)
CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Upload : tout membre authentifié de l'école dont l'ID est le 1er segment du path
CREATE POLICY "Ecole members upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Ecole members update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Ecole members delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[1])::uuid)
);