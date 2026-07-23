
-- 1) Ajouter grille_id sur les abonnements
ALTER TABLE public.abonnements_cantine
  ADD COLUMN IF NOT EXISTS grille_id UUID REFERENCES public.grille_tarifs_services(id) ON DELETE SET NULL;

ALTER TABLE public.abonnements_transport
  ADD COLUMN IF NOT EXISTS grille_id UUID REFERENCES public.grille_tarifs_services(id) ON DELETE SET NULL;

-- 2) RPC de génération des factures pour un abonnement
CREATE OR REPLACE FUNCTION public.generer_factures_service(
  _ecole_id UUID,
  _abonnement_id UUID,
  _service_type TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_annee UUID;
  v_eleve UUID;
  v_grille UUID;
  v_libelle TEXT;
  v_tranches JSONB;
  v_periodicite TEXT;
  v_annee_debut INT;
  v_tr JSONB;
  v_numero TEXT;
  v_montant NUMERIC;
  v_date DATE;
  v_label TEXT;
  v_prefix TEXT;
  v_count INT := 0;
BEGIN
  v_prefix := CASE WHEN _service_type = 'cantine' THEN 'CTN' ELSE 'TRP' END;

  IF _service_type = 'cantine' THEN
    SELECT a.annee_id, a.eleve_id, a.grille_id
      INTO v_annee, v_eleve, v_grille
    FROM abonnements_cantine a WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  ELSE
    SELECT a.annee_id, a.eleve_id, a.grille_id
      INTO v_annee, v_eleve, v_grille
    FROM abonnements_transport a WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  END IF;

  IF v_grille IS NULL THEN
    RAISE EXCEPTION 'Aucun tarif rattaché à cet abonnement. Choisissez un tarif avant de générer les factures.';
  END IF;

  SELECT g.libelle, g.tranches, g.periodicite
    INTO v_libelle, v_tranches, v_periodicite
  FROM grille_tarifs_services g WHERE g.id = v_grille;

  SELECT EXTRACT(YEAR FROM COALESCE(a.date_debut, now()))::INT
    INTO v_annee_debut
  FROM annees_scolaires a WHERE a.id = v_annee;
  v_annee_debut := COALESCE(v_annee_debut, EXTRACT(YEAR FROM now())::INT);

  FOR v_tr IN SELECT * FROM jsonb_array_elements(COALESCE(v_tranches, '[]'::jsonb))
  LOOP
    v_montant := COALESCE((v_tr->>'montant')::NUMERIC, 0);
    v_label := COALESCE(v_tr->>'label', 'Tranche ' || COALESCE(v_tr->>'numero','?'));
    -- construire date (année scolaire : mois 1-6 -> année_debut+1, 7-12 -> année_debut)
    BEGIN
      v_date := make_date(
        CASE WHEN COALESCE((v_tr->>'mois')::INT, 9) < 7 THEN v_annee_debut + 1 ELSE v_annee_debut END,
        COALESCE((v_tr->>'mois')::INT, 9),
        LEAST(COALESCE((v_tr->>'jour')::INT, 1), 28)
      );
    EXCEPTION WHEN OTHERS THEN v_date := CURRENT_DATE; END;

    v_numero := v_prefix || '-' || substr(_abonnement_id::TEXT, 1, 8) || '-' || COALESCE(v_tr->>'numero', v_count::TEXT);

    -- Idempotence : ne pas dupliquer par numéro
    IF NOT EXISTS (SELECT 1 FROM factures WHERE ecole_id = _ecole_id AND numero = v_numero) THEN
      INSERT INTO factures (ecole_id, eleve_id, annee_id, numero, libelle, montant, date_echeance, statut, categorie)
      VALUES (_ecole_id, v_eleve, v_annee, v_numero,
              v_libelle || ' — ' || v_label,
              v_montant, v_date, 'emise', _service_type);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.generer_factures_service(UUID, UUID, TEXT) TO authenticated;
