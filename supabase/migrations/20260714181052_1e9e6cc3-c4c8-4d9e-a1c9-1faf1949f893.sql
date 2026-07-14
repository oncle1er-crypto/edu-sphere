
-- Supprimer l'ancienne surcharge 1-arg pour lever l'ambiguïté PostgREST
DROP FUNCTION IF EXISTS public.generer_tranches_eleve(uuid);

-- Recréer la version 2-arg avec absorption de l'arrondi sur la dernière tranche
CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid, _force_recalc boolean DEFAULT true)
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
    -- Dernière tranche absorbe le résidu d'arrondi pour que la somme colle au total
    v_montant_last := v_total - v_montant_unit * (v_nb - 1);

    DELETE FROM tranches
     WHERE eleve_id = _eleve_id
       AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id);

    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY numero, created_at) AS rn
        FROM tranches WHERE eleve_id = _eleve_id
    )
    UPDATE tranches t
       SET frais_id = v_frais_id,
           numero = -r.rn,
           updated_at = now()
      FROM ranked r
     WHERE t.id = r.id;

    UPDATE tranches t
       SET numero = -t.numero,
           label = CASE WHEN -t.numero = 1 THEN '1ere tranche' ELSE 'Tranche ' || (-t.numero) END,
           montant = CASE
                       WHEN _force_recalc OR t.paye = 0 THEN
                         CASE WHEN -t.numero = v_nb THEN v_montant_last ELSE v_montant_unit END
                       ELSE t.montant
                     END,
           echeance = v_annee_debut + ((v_annee_fin - v_annee_debut) * (-t.numero) / v_nb),
           statut = CASE
                      WHEN t.paye <= 0 THEN 'due'::statut_tranche
                      WHEN t.paye >= (
                        CASE
                          WHEN _force_recalc OR t.paye = 0 THEN
                            CASE WHEN -t.numero = v_nb THEN v_montant_last ELSE v_montant_unit END
                          ELSE t.montant
                        END
                      ) THEN 'soldee'::statut_tranche
                      ELSE 'partielle'::statut_tranche
                    END,
           updated_at = now()
     WHERE t.eleve_id = _eleve_id AND t.numero < 0;

    FOR v_idx IN 1..v_nb LOOP
      IF NOT EXISTS (
        SELECT 1 FROM tranches WHERE eleve_id = _eleve_id AND frais_id = v_frais_id AND numero = v_idx
      ) THEN
        v_date := v_annee_debut + ((v_annee_fin - v_annee_debut) * v_idx / v_nb);
        INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
        VALUES (v_ecole, _eleve_id, v_frais_id, v_idx,
                CASE WHEN v_idx = 1 THEN '1ere tranche' ELSE 'Tranche ' || v_idx END,
                v_date,
                CASE WHEN v_idx = v_nb THEN v_montant_last ELSE v_montant_unit END,
                0, 'due');
      END IF;
    END LOOP;

    RETURN;
  END IF;

  IF v_classe_nom IS NULL THEN RETURN; END IF;

  v_niveau := public.resoudre_niveau_code(v_classe_nom);
  v_variant := CASE WHEN v_niveau = 'GS' THEN (CASE WHEN v_est_nouveau THEN 'nouveau' ELSE 'ancien' END) ELSE NULL END;

  IF v_niveau IS NOT NULL THEN
    SELECT * INTO v_grille FROM grille_tarifs_niveaux
     WHERE ecole_id = v_ecole AND annee_id = v_annee AND niveau_code = v_niveau
       AND (variant IS NOT DISTINCT FROM v_variant)
     LIMIT 1;
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

  DELETE FROM tranches WHERE eleve_id = _eleve_id AND frais_id <> v_frais_id
    AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id);

  v_year := EXTRACT(YEAR FROM v_annee_debut);
  FOR v_idx IN 0..(v_nb-1) LOOP
    t := v_tranches -> v_idx;
    v_mois := (t->>'mois')::int;
    v_jour := (t->>'jour')::int;
    v_date := make_date(CASE WHEN v_mois >= EXTRACT(MONTH FROM v_annee_debut)::int THEN v_year ELSE v_year + 1 END, v_mois, v_jour);
    INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
    VALUES (v_ecole, _eleve_id, v_frais_id, (t->>'numero')::int,
            COALESCE(t->>'label', 'Tranche ' || (t->>'numero')),
            v_date, (t->>'montant')::numeric, 0, 'due')
    ON CONFLICT (eleve_id, frais_id, numero) DO UPDATE
      SET montant = EXCLUDED.montant, label = EXCLUDED.label, echeance = EXCLUDED.echeance, updated_at = now();
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generer_tranches_eleve(uuid, boolean) TO authenticated;
