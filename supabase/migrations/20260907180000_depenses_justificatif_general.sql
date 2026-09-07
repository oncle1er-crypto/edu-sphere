-- Justificatif général d'une dépense (facture, reçu, ticket du fournisseur…),
-- distinct de fiche_piece_jointe_* (scan de la fiche de paiement à faire
-- signer par le bénéficiaire, cf. migration 20260815190500) : une dépense
-- peut avoir les deux pièces jointes simultanément (la fiche signée ET la
-- facture/le reçu justifiant la dépense elle-même). Réutilise le même bucket
-- privé "justificatifs-depenses" (mêmes contraintes mime/taille déjà en
-- place : pdf/jpeg/png/webp, 10 Mo), même convention de chemin
-- ecole_id/depense_id/….
--
-- Peut être joint à la création de la dépense ou tant qu'elle est encore en
-- brouillon ("en_attente") — jamais après validation/rejet, cohérent avec
-- updateDepense qui interdit déjà toute modification à ce stade.

ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS justificatif_chemin text,
  ADD COLUMN IF NOT EXISTS justificatif_nom text;

-- Storage RLS déjà en place (migration 20260815190500) couvre admin/comptable
-- pour INSERT/UPDATE/DELETE sur ce bucket. On ajoute ici la capacité pour le
-- rôle "secretaire" de joindre ce justificatif général tant que la dépense
-- est en brouillon — parité avec sa capacité déjà acquise de créer/modifier
-- ces mêmes brouillons au niveau de la table depenses elle-même (cf.
-- migration 20260817083000, policies "depenses_secretaire_insert_brouillon"
-- / "depenses_secretaire_update_brouillon"). Sans cette policy, le
-- téléversement échouerait silencieusement pour ce rôle alors que l'UI le
-- lui présenterait (secretaire peut créer/modifier un brouillon de dépense
-- mais n'a pas le rôle admin/comptable requis par les policies existantes).
--
-- Politiques additives (permissives, combinées en OR avec les policies
-- existantes) : n'affaiblit ni ne remplace les policies admin/comptable déjà
-- en place, n'élargit rien au-delà de ce que ce rôle peut déjà faire sur la
-- ligne depenses correspondante.

CREATE POLICY "depenses_justificatifs_insert_secretaire"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'justificatifs-depenses'
  AND private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'secretaire'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.depenses d
    WHERE d.id::text = (storage.foldername(name))[2]
      AND d.ecole_id = (storage.foldername(name))[1]::uuid
      AND d.statut = 'en_attente'
  )
);

CREATE POLICY "depenses_justificatifs_update_secretaire"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'justificatifs-depenses'
  AND private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'secretaire'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.depenses d
    WHERE d.id::text = (storage.foldername(name))[2]
      AND d.ecole_id = (storage.foldername(name))[1]::uuid
      AND d.statut = 'en_attente'
  )
);
