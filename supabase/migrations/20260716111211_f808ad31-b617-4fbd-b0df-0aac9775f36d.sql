-- Corrige deux incohérences de generer_tranches_eleve :
-- 1) _force_recalc passe à FALSE par défaut : un changement de classe ne réécrase
--    plus les montants des tranches déjà payées. Le composant CustomFeeOverride
--    continue de passer explicitement TRUE quand la case « Corriger une erreur
--    d'affectation initiale » est cochée.
-- 2) Le statut « retard » est désormais persisté quand la tranche est due mais
--    l'échéance est passée (avant, seuls due/payee/partielle étaient posés).

CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid, _force_recalc boolean DEFAULT false)
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
  v_montant_unit numeric;
  v_montant_last numeric;
  v_numero int;
  v_label text;
  v_montant numeric;
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

  IF v_override IS NOT NULL THEN
    SELECT * INTO v_frais FROM frais_scolarite WHERE id = v_override AND ecole_id = v_ecole AND annee_id = v_annee;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Grille tarifaire personnalisee introuvable ou hors annee/ecole';
    END IF;
    v_frais_id := v_frais.id;
    v_total := v_frais.montant_annuel;
    v_nb := GREATEST(v_frais.nb_tranches, 1);
    v_montant_unit := FLOOR(v_total / v_nb);
    v_montant_last := v_total - v_montant_unit * (v_nb - 1);

    DELETE FROM tranches tr
     USING frais_scolarite fs
     WHERE tr.eleve_id = _eleve_id
       AND tr.frais_id = fs.id
       AND fs.annee_id = v_annee
       AND tr.frais_id <> v_frais_id
       AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tr.id);

    FOR v_idx IN 1..v_nb LOOP
      v_date := v_annee_debut + ((v_annee_fin - v_annee_debut) * v_idx / v_nb);
      v_montant := CASE WHEN v_idx = v_nb THEN v_montant_last ELSE v_montant_unit END;
      v_label := CASE WHEN v_idx = 1 THEN '1ere tranche' ELSE 'Tranche ' || v_idx END;

      UPDATE tranches tr
         SET frais_id = v_frais_id,
             label = v_label,
             montant = CASE WHEN _force_recalc OR tr.paye = 0 THEN v_montant ELSE tr.montant END,
             echeance = v_date,
             statut = CASE
                        WHEN tr.paye <= 0 AND v_date < CURRENT_DATE THEN 'retard'::tranche_statut
                        WHEN tr.paye <= 0 THEN 'due'::tranche_statut
                        WHEN tr.paye >= (CASE WHEN _force_recalc OR tr.paye = 0 THEN v_montant ELSE tr.montant END) THEN 'payee'::tranche_statut
                        ELSE 'partielle'::tranche_statut
                      END,
             updated_at = now()
       FROM frais_scolarite fs
       WHERE tr.frais_id = fs.id
         AND fs.annee_id = v_annee
         AND tr.eleve_id = _eleve_id
         AND tr.ecole_id = v_ecole
         AND tr.numero = v_idx;

      IF NOT FOUND THEN
        INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
        VALUES (
          v_ecole, _eleve_id, v_frais_id, v_idx, v_label, v_date, v_montant, 0,
          CASE WHEN v_date < CURRENT_DATE THEN 'retard'::tranche_statut ELSE 'due'::tranche_statut END
        )
        ON CONFLICT (eleve_id, frais_id, numero) DO UPDATE
          SET label = EXCLUDED.label,
              echeance = EXCLUDED.echeance,
              montant = CASE WHEN _force_recalc OR tranches.paye = 0 THEN EXCLUDED.montant ELSE tranches.montant END,
              statut = CASE
                         WHEN tranches.paye <= 0 AND EXCLUDED.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
                         WHEN tranches.paye <= 0 THEN 'due'::tranche_statut
                         WHEN tranches.paye >= (CASE WHEN _force_recalc OR tranches.paye = 0 THEN EXCLUDED.montant ELSE tranches.montant END) THEN 'payee'::tranche_statut
                         ELSE 'partielle'::tranche_statut
                       END,
              updated_at = now();
      END IF;
    END LOOP;

    RETURN;
  END IF;

  IF v_classe_nom IS NULL THEN RETURN; END IF;

  v_niveau := public.resoudre_niveau_code(v_classe_nom);
  v_variant := CASE
                 WHEN v_niveau IN ('MAT1','MAT2','GS')
                   THEN (CASE WHEN v_est_nouveau THEN 'nouveau' ELSE 'ancien' END)
                 ELSE NULL
               END;

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

  IF v_grille.id IS NULL THEN RETURN; END IF;

  v_total := v_grille.montant_total;
  v_tranches := v_grille.tranches;
  v_nb := COALESCE(jsonb_array_length(v_tranches), 0);

  SELECT id INTO v_frais_id FROM frais_scolarite
   WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle AND libelle = v_grille.libelle
   LIMIT 1;

  IF v_frais_id IS NULL THEN
    INSERT INTO frais_scolarite (ecole_id, annee_id, cycle_id, libelle, montant_annuel, nb_tranches)
    VALUES (v_ecole, v_annee, v_cycle, v_grille.libelle, v_total, v_nb)
    RETURNING id INTO v_frais_id;
  ELSE
    UPDATE frais_scolarite SET montant_annuel = v_total, nb_tranches = v_nb WHERE id = v_frais_id;
  END IF;

  DELETE FROM tranches tr
  USING frais_scolarite fs
  WHERE tr.eleve_id = _eleve_id
    AND tr.frais_id = fs.id
    AND fs.annee_id = v_annee
    AND tr.frais_id <> v_frais_id
    AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tr.id);

  v_year := EXTRACT(YEAR FROM v_annee_debut);
  FOR v_idx IN 0..(v_nb-1) LOOP
    t := v_tranches -> v_idx;
    v_numero := (t->>'numero')::int;
    v_label := COALESCE(t->>'label', 'Tranche ' || (t->>'numero'));
    v_montant := (t->>'montant')::numeric;
    v_mois := (t->>'mois')::int;
    v_jour := (t->>'jour')::int;
    v_date := make_date(CASE WHEN v_mois >= EXTRACT(MONTH FROM v_annee_debut)::int THEN v_year ELSE v_year + 1 END, v_mois, v_jour);

    UPDATE tranches tr
       SET frais_id = v_frais_id,
           label = v_label,
           echeance = v_date,
           montant = CASE WHEN _force_recalc OR tr.paye = 0 THEN v_montant ELSE tr.montant END,
           statut = CASE
                      WHEN tr.paye <= 0 AND v_date < CURRENT_DATE THEN 'retard'::tranche_statut
                      WHEN tr.paye <= 0 THEN 'due'::tranche_statut
                      WHEN tr.paye >= (CASE WHEN _force_recalc OR tr.paye = 0 THEN v_montant ELSE tr.montant END) THEN 'payee'::tranche_statut
                      ELSE 'partielle'::tranche_statut
                    END,
           updated_at = now()
     FROM frais_scolarite fs
     WHERE tr.frais_id = fs.id
       AND fs.annee_id = v_annee
       AND tr.eleve_id = _eleve_id
       AND tr.ecole_id = v_ecole
       AND tr.numero = v_numero;

    IF NOT FOUND THEN
      INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
      VALUES (
        v_ecole, _eleve_id, v_frais_id, v_numero, v_label, v_date, v_montant, 0,
        CASE WHEN v_date < CURRENT_DATE THEN 'retard'::tranche_statut ELSE 'due'::tranche_statut END
      )
      ON CONFLICT (eleve_id, frais_id, numero) DO UPDATE
        SET montant = EXCLUDED.montant,
            label = EXCLUDED.label,
            echeance = EXCLUDED.echeance,
            statut = CASE
                       WHEN tranches.paye <= 0 AND EXCLUDED.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
                       WHEN tranches.paye <= 0 THEN 'due'::tranche_statut
                       WHEN tranches.paye >= EXCLUDED.montant THEN 'payee'::tranche_statut
                       ELSE 'partielle'::tranche_statut
                     END,
            updated_at = now();
    END IF;
  END LOOP;
END;
$function$;