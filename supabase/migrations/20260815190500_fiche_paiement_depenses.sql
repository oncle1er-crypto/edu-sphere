-- Fiche de paiement à faire signer par le bénéficiaire d'une dépense.
--
-- Champs optionnels sur depenses (remplis seulement si l'utilisateur active
-- le bascule "Fiche de paiement" dans le formulaire) : objet du document,
-- identité du bénéficiaire, période de service couverte. Une fois la fiche
-- imprimée, signée à la main par le bénéficiaire puis scannée, le fichier
-- scanné est téléversé et référencé par fiche_piece_jointe_chemin — même
-- logique que documents_eleves (chemin de stockage privé, pas d'URL
-- publique, téléchargé via un lien signé/Blob).
--
-- Bucket dédié plutôt que réutilisation de "recus" (qui contient des PDF
-- générés automatiquement à l'encaissement, pas des scans de documents
-- signés à la main) ou "documents-eleves" (portée élève, pas dépense).
-- RLS calquée sur la policy d'écriture déjà en place sur la table
-- depenses elle-même (admin OU comptable, cf. migration 20260502222203).

ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS fiche_objet text,
  ADD COLUMN IF NOT EXISTS fiche_beneficiaire_nom text,
  ADD COLUMN IF NOT EXISTS fiche_beneficiaire_fonction text,
  ADD COLUMN IF NOT EXISTS fiche_periode_service text,
  ADD COLUMN IF NOT EXISTS fiche_piece_jointe_chemin text,
  ADD COLUMN IF NOT EXISTS fiche_piece_jointe_nom text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justificatifs-depenses',
  'justificatifs-depenses',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- NB : user_belongs_to_ecole / has_ecole_role vivent dans le schéma "private"
-- depuis la migration 20260508175438 (les versions "public." ont été
-- supprimées) — cf. billets_sortie (20260527170528) qui utilise déjà le
-- même préfixe explicite. Un appel non qualifié échoue donc ici.

CREATE POLICY "depenses_justificatifs_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'justificatifs-depenses'
  AND private.user_belongs_to_ecole(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "depenses_justificatifs_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'justificatifs-depenses'
  AND (
    private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'comptable'::public.app_role)
  )
);

CREATE POLICY "depenses_justificatifs_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'justificatifs-depenses'
  AND (
    private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'comptable'::public.app_role)
  )
);

CREATE POLICY "depenses_justificatifs_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'justificatifs-depenses'
  AND (
    private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'comptable'::public.app_role)
  )
);
