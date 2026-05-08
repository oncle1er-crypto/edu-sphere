
CREATE OR REPLACE FUNCTION public.check_and_promote_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _eleve RECORD;
  _required_types TEXT[] := ARRAY['acte_naissance','photo_identite','certificat_scolarite'];
  _has_all_docs BOOLEAN;
  _has_payment BOOLEAN;
BEGIN
  SELECT id, ecole_id, classe_id, statut INTO _eleve
  FROM eleves WHERE id = _eleve_id;
  IF NOT FOUND OR _eleve.statut <> 'pre_inscrit' THEN RETURN; END IF;

  SELECT (SELECT COUNT(DISTINCT type_document) FROM documents_eleves
          WHERE eleve_id = _eleve_id AND type_document = ANY(_required_types))
         = array_length(_required_types, 1)
  INTO _has_all_docs;

  SELECT EXISTS(
    SELECT 1 FROM factures WHERE eleve_id = _eleve_id AND montant_paye > 0
  ) INTO _has_payment;

  IF _eleve.classe_id IS NOT NULL AND _has_all_docs AND _has_payment THEN
    UPDATE eleves SET statut = 'inscrit', updated_at = now() WHERE id = _eleve_id;
  END IF;
END;
$$;
