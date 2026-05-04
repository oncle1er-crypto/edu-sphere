-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents-eleves',
  'documents-eleves',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for documents-eleves bucket
CREATE POLICY "Ecole members can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents-eleves'
  AND user_belongs_to_ecole(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents-eleves'
  AND (
    has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::app_role)
    OR has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'directeur'::app_role)
  )
);

CREATE POLICY "Admins can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents-eleves'
  AND (
    has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::app_role)
    OR has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'directeur'::app_role)
  )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents-eleves'
  AND (
    has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::app_role)
    OR has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'directeur'::app_role)
  )
);

-- Create documents_eleves metadata table
CREATE TABLE public.documents_eleves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  type_document text NOT NULL,
  nom_fichier text NOT NULL,
  chemin_stockage text NOT NULL,
  taille bigint,
  mime_type text,
  uploade_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents_eleves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.documents_eleves
FOR SELECT TO authenticated
USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.documents_eleves
FOR ALL TO authenticated
USING (
  has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
)
WITH CHECK (
  has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE TRIGGER update_documents_eleves_updated_at
BEFORE UPDATE ON public.documents_eleves
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();