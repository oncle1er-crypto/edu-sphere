-- Le statut doit être vérifié sous le verrou UPDATE, pas seulement dans React.
CREATE OR REPLACE FUNCTION public.protect_depense_justificatif()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.justificatif_chemin, NEW.justificatif_nom)
       IS DISTINCT FROM (OLD.justificatif_chemin, OLD.justificatif_nom)
     AND (OLD.statut <> 'en_attente' OR NEW.statut <> 'en_attente') THEN
    RAISE EXCEPTION 'Le justificatif ne peut être modifié que sur une dépense en attente';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_depense_justificatif
BEFORE UPDATE ON public.depenses FOR EACH ROW
EXECUTE FUNCTION public.protect_depense_justificatif();

-- Autoriser le nettoyage des uploads abandonnés / remplacés par la secrétaire,
-- sans autoriser la suppression du justificatif encore référencé ni de la fiche signée.
CREATE POLICY depenses_justificatifs_cleanup_secretaire ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'justificatifs-depenses'
  AND storage.filename(name) LIKE 'justificatif-%'
  AND private.has_ecole_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'secretaire'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.depenses d
    WHERE d.id::text = (storage.foldername(name))[2]
      AND d.ecole_id::text = (storage.foldername(name))[1]
      AND d.justificatif_chemin IS DISTINCT FROM name
      AND d.fiche_piece_jointe_chemin IS DISTINCT FROM name
  )
);
