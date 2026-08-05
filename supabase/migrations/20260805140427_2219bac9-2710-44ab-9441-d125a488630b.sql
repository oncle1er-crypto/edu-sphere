DROP FUNCTION IF EXISTS public.generer_factures_service(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.generer_factures_service(
  _ecole_id uuid,
  _abonnement_id uuid,
  _service_type text,
  _forcer boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_annee UUID; v_eleve UUID; v_grille UUID; v_statut TEXT;
  v_libelle TEXT; v_tranches JSONB; v_annee_debut INT;
  v_tr JSONB; v_numero TEXT; v_montant NUMERIC; v_date DATE; v_label TEXT;
  v_prefix TEXT;
  v_open_numero TEXT; v_open_echeance DATE;
BEGIN
  IF _service_type NOT IN ('cantine','transport') THEN
    RAISE EXCEPTION 'Service inconnu';
  END IF;

  v_prefix := CASE WHEN _service_type = 'cantine' THEN 'CTN' ELSE 'TRP' END;

  IF _service_type = 'cantine' THEN
    SELECT a.annee_id, a.eleve_id, a.grille_id, a.statut
      INTO v_annee, v_eleve, v_grille, v_statut
    FROM abonnements_cantine a WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  ELSE
    SELECT a.annee_id, a.eleve_id, a.grille_id, a.statut
      INTO v_annee, v_eleve, v_grille, v_statut
    FROM abonnements_transport a WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  END IF;

  IF v_annee IS NULL THEN
    RETURN 0;
  END IF;

  IF v_statut IS DISTINCT FROM 'actif' THEN
    RETURN 0;
  END IF;

  IF v_grille IS NULL THEN
    RAISE EXCEPTION 'Aucun tarif rattaché à cet abonnement. Choisissez un tarif avant de générer les factures.';
  END IF;

  -- Blocage : une facture de ce service non soldée interdit l'ouverture d'une nouvelle période.
  SELECT f.numero, f.date_echeance INTO v_open_numero, v_open_echeance
  FROM factures f
  WHERE f.ecole_id = _ecole_id
    AND f.eleve_id = v_eleve
    AND f.annee_id = v_annee
    AND f.categorie = _service_type
    AND f.statut <> 'annulee'
    AND COALESCE(f.montant_paye, 0) < f.montant
  ORDER BY f.date_echeance
  LIMIT 1;

  IF v_open_numero IS NOT NULL THEN
    RAISE EXCEPTION 'facture_precedente_non_soldee:%:%',
      v_open_numero, to_char(v_open_echeance, 'DD/MM/YYYY');
  END IF;

  SELECT g.libelle, g.tranches INTO v_libelle, v_tranches
  FROM grille_tarifs_services g WHERE g.id = v_grille;

  SELECT EXTRACT(YEAR FROM COALESCE(a.debut, CURRENT_DATE))::INT INTO v_annee_debut
  FROM annees_scolaires a WHERE a.id = v_annee;
  v_annee_debut := COALESCE(v_annee_debut, EXTRACT(YEAR FROM now())::INT);

  -- Première tranche non encore facturée (ordre croissant du numéro de tranche).
  FOR v_tr IN
    SELECT t FROM jsonb_array_elements(COALESCE(v_tranches, '[]'::jsonb)) AS t
    ORDER BY COALESCE((t->>'numero')::INT, 999)
  LOOP
    v_numero := v_prefix || '-' || substr(_abonnement_id::TEXT, 1, 8) || '-' || COALESCE(v_tr->>'numero', '0');

    IF EXISTS (
      SELECT 1 FROM factures
      WHERE ecole_id = _ecole_id AND numero = v_numero AND statut <> 'annulee'
    ) THEN
      CONTINUE;
    END IF;

    v_montant := COALESCE((v_tr->>'montant')::NUMERIC, 0);
    v_label := COALESCE(v_tr->>'label', 'Tranche ' || COALESCE(v_tr->>'numero','?'));
    BEGIN
      v_date := make_date(
        CASE WHEN COALESCE((v_tr->>'mois')::INT, 9) < 7 THEN v_annee_debut + 1 ELSE v_annee_debut END,
        COALESCE((v_tr->>'mois')::INT, 9),
        LEAST(COALESCE((v_tr->>'jour')::INT, 1), 28)
      );
    EXCEPTION WHEN OTHERS THEN v_date := CURRENT_DATE; END;

    -- Avant l'échéance : rien, sauf encaissement par anticipation.
    IF v_date > CURRENT_DATE AND NOT COALESCE(_forcer, false) THEN
      RETURN 0;
    END IF;

    -- Une facture annulée peut exister avec ce numéro : on le rend unique.
    IF EXISTS (SELECT 1 FROM factures WHERE ecole_id = _ecole_id AND numero = v_numero) THEN
      v_numero := v_numero || '-R' || to_char(now(), 'MMDDHH24MISS');
    END IF;

    INSERT INTO factures (ecole_id, eleve_id, annee_id, numero, libelle, montant, date_echeance, statut, categorie)
    VALUES (_ecole_id, v_eleve, v_annee, v_numero,
            v_libelle || ' — ' || v_label, v_montant, v_date, 'emise', _service_type);

    UPDATE echeances_services
       SET statut = CASE WHEN v_date < CURRENT_DATE THEN 'retard' ELSE 'due' END,
           updated_at = now()
     WHERE ecole_id = _ecole_id AND eleve_id = v_eleve AND annee_id = v_annee
       AND service_type = _service_type
       AND numero = COALESCE((v_tr->>'numero')::INT, -1);

    RETURN 1;
  END LOOP;

  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generer_factures_service(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generer_factures_service(uuid, uuid, text, boolean) TO service_role;