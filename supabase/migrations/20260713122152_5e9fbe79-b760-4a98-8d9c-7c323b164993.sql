
ALTER TABLE public.eleves
  ADD COLUMN IF NOT EXISTS frais_id_override uuid REFERENCES public.frais_scolarite(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eleves_frais_override ON public.eleves(frais_id_override);

CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ecole uuid; v_annee uuid; v_cycle uuid;
  v_classe_nom text; v_est_nouveau boolean;
  v_override uuid;
  v_niveau text; v_variant text;
  v_grille RECORD; v_frais RECORD;
  v_frais_id uuid; v_total numeric; v_nb int;
  v_tranches jsonb;
  t jsonb; v_idx int := 0;
  v_annee_debut date; v_annee_fin date;
  v_uid uuid := auth.uid();
  v_mois int; v_jour int; v_year int; v_date date;
BEGIN
  SELECT e.ecole_id, e.annee_id, c.cycle_id, c.nom, e.est_nouveau, e.frais_id_override
    INTO v_ecole, v_annee, v_cycle, v_classe_nom, v_est_nouveau, v_override
  FROM eleves e LEFT JOIN classes c ON c.id = e.classe_id
  WHERE e.id = _eleve_id;

  IF v_ecole IS NULL OR v_annee IS NULL THEN RETURN; END IF;

  IF v_uid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND ecole_id = v_ecole) THEN
      RAISE EXCEPTION 'Acces refuse';
    END IF;
  END IF;

  SELECT debut, fin INTO v_annee_debut, v_annee_fin FROM annees_scolaires WHERE id = v_annee;

  -- 1) OVERRIDE explicite : on utilise directement ce frais_id
  IF v_override IS NOT NULL THEN
    SELECT * INTO v_frais FROM frais_scolarite WHERE id = v_override AND ecole_id = v_ecole AND annee_id = v_annee;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Grille tarifaire personnalisee introuvable ou hors annee/ecole';
    END IF;
    v_frais_id := v_frais.id;
    v_total := v_frais.montant_annuel;
    v_nb := GREATEST(v_frais.nb_tranches, 1);

    -- Purger l'ancien echeancier (autre frais_id) SANS paiement
    DELETE FROM tranches WHERE eleve_id = _eleve_id AND frais_id <> v_frais_id
      AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id);

    -- Generer tranches egales, echeance repartie de debut a fin annee
    FOR v_idx IN 1..v_nb LOOP
      v_date := v_annee_debut + ((v_annee_fin - v_annee_debut) * v_idx / v_nb);
      INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
      VALUES (v_ecole, _eleve_id, v_frais_id, v_idx, 'Tranche ' || v_idx,
              v_date, ROUND(v_total / v_nb), 0, 'due')
      ON CONFLICT (eleve_id, frais_id, numero) DO UPDATE
        SET montant = EXCLUDED.montant, label = EXCLUDED.label, echeance = EXCLUDED.echeance, updated_at = now();
    END LOOP;
    RETURN;
  END IF;

  -- 2) Mode automatique historique (basé sur la classe)
  IF v_classe_nom IS NULL THEN RETURN; END IF;

  v_niveau := public.resoudre_niveau_code(v_classe_nom);
  v_variant := CASE WHEN v_niveau = 'GS' THEN (CASE WHEN v_est_nouveau THEN 'nouveau' ELSE 'ancien' END) ELSE NULL END;

  IF v_niveau IS NOT NULL THEN
    SELECT * INTO v_grille FROM grille_tarifs_niveaux
     WHERE ecole_id = v_ecole AND annee_id = v_annee AND niveau_code = v_niveau
       AND (variant IS NOT DISTINCT FROM v_variant)
     LIMIT 1;
    IF NOT FOUND AND v_variant IS NOT NULL THEN
      SELECT * INTO v_grille FROM grille_tarifs_niveaux
       WHERE ecole_id = v_ecole AND annee_id = v_annee AND niveau_code = v_niveau AND variant IS NULL
       LIMIT 1;
    END IF;
  END IF;

  IF FOUND AND jsonb_array_length(v_grille.tranches) > 0 THEN
    SELECT id INTO v_frais_id FROM frais_scolarite
     WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle
       AND libelle = 'Scolarité — ' || v_grille.libelle
     LIMIT 1;

    IF v_frais_id IS NULL THEN
      INSERT INTO frais_scolarite (ecole_id, annee_id, cycle_id, libelle, montant_annuel, nb_tranches)
      VALUES (v_ecole, v_annee, v_cycle, 'Scolarité — ' || v_grille.libelle, v_grille.montant_total, jsonb_array_length(v_grille.tranches))
      RETURNING id INTO v_frais_id;
    ELSE
      UPDATE frais_scolarite SET montant_annuel = v_grille.montant_total,
             nb_tranches = jsonb_array_length(v_grille.tranches), updated_at = now()
       WHERE id = v_frais_id;
    END IF;

    DELETE FROM tranches WHERE eleve_id = _eleve_id AND frais_id <> v_frais_id
      AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id);

    v_tranches := v_grille.tranches;
    FOR v_idx IN 0..(jsonb_array_length(v_tranches) - 1) LOOP
      t := v_tranches -> v_idx;
      v_mois := COALESCE((t->>'mois')::int, ((v_idx + 1) * 3));
      v_jour := COALESCE((t->>'jour')::int, 5);
      v_year := CASE WHEN v_mois >= EXTRACT(MONTH FROM v_annee_debut)::int
                     THEN EXTRACT(YEAR FROM v_annee_debut)::int
                     ELSE EXTRACT(YEAR FROM v_annee_fin)::int END;
      v_date := make_date(v_year, v_mois, LEAST(v_jour, 28));
      INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
      VALUES (v_ecole, _eleve_id, v_frais_id, v_idx + 1,
              COALESCE(t->>'libelle', 'Tranche ' || (v_idx + 1)),
              v_date, (t->>'montant')::numeric, 0, 'due')
      ON CONFLICT (eleve_id, frais_id, numero) DO UPDATE
        SET montant = EXCLUDED.montant, label = EXCLUDED.label, echeance = EXCLUDED.echeance, updated_at = now();
    END LOOP;
    RETURN;
  END IF;

  -- 3) Fallback historique : premier frais du cycle
  SELECT * INTO v_frais FROM frais_scolarite
   WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle
   ORDER BY created_at LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  v_frais_id := v_frais.id;
  v_total := v_frais.montant_annuel;
  v_nb := GREATEST(v_frais.nb_tranches, 1);

  DELETE FROM tranches WHERE eleve_id = _eleve_id AND frais_id <> v_frais_id
    AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id);

  FOR v_idx IN 1..v_nb LOOP
    v_date := v_annee_debut + ((v_annee_fin - v_annee_debut) * v_idx / v_nb);
    INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
    VALUES (v_ecole, _eleve_id, v_frais_id, v_idx, 'Tranche ' || v_idx,
            v_date, ROUND(v_total / v_nb), 0, 'due')
    ON CONFLICT (eleve_id, frais_id, numero) DO UPDATE
      SET montant = EXCLUDED.montant, label = EXCLUDED.label, echeance = EXCLUDED.echeance, updated_at = now();
  END LOOP;
END;
$function$;
