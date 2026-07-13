
-- 1. Nettoyage : supprimer les tranches non payées appartenant à un frais différent
-- du frais "actuel" (celui du cycle de la classe de l'élève).
DELETE FROM public.tranches t
USING public.eleves e, public.classes c
WHERE t.eleve_id = e.id
  AND e.classe_id = c.id
  AND t.paye = 0
  AND NOT EXISTS (SELECT 1 FROM public.paiements p WHERE p.tranche_id = t.id)
  AND EXISTS (
    SELECT 1 FROM public.tranches t2
    JOIN public.frais_scolarite f2 ON f2.id = t2.frais_id
    WHERE t2.eleve_id = t.eleve_id
      AND t2.frais_id <> t.frais_id
      AND f2.cycle_id = c.cycle_id
  )
  AND EXISTS (
    SELECT 1 FROM public.frais_scolarite f
    WHERE f.id = t.frais_id AND f.cycle_id <> c.cycle_id
  );

-- 2. Contrainte d'intégrité : un seul (eleve, frais, numero)
CREATE UNIQUE INDEX IF NOT EXISTS tranches_eleve_frais_numero_uniq
  ON public.tranches(eleve_id, frais_id, numero);

-- 3. Refonte : purger l'ancien échéancier (si aucun paiement) avant d'en créer un nouveau.
CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ecole uuid; v_annee uuid; v_cycle uuid;
  v_classe_nom text; v_est_nouveau boolean;
  v_niveau text; v_variant text;
  v_grille RECORD; v_frais RECORD;
  v_frais_id uuid; v_total numeric;
  t jsonb; v_idx int := 0;
  v_annee_debut date; v_annee_fin date;
  v_uid uuid := auth.uid();
  v_mois int; v_jour int; v_year int; v_date date;
BEGIN
  SELECT e.ecole_id, e.annee_id, c.cycle_id, c.nom, e.est_nouveau
    INTO v_ecole, v_annee, v_cycle, v_classe_nom, v_est_nouveau
  FROM eleves e LEFT JOIN classes c ON c.id = e.classe_id
  WHERE e.id = _eleve_id;

  IF v_ecole IS NULL OR v_annee IS NULL OR v_classe_nom IS NULL THEN RETURN; END IF;

  IF v_uid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND ecole_id = v_ecole) THEN
      RAISE EXCEPTION 'Acces refuse';
    END IF;
  END IF;

  SELECT debut, fin INTO v_annee_debut, v_annee_fin FROM annees_scolaires WHERE id = v_annee;

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

    -- Purger les tranches d'un ancien échéancier (autre frais_id) SI aucun paiement rattaché.
    IF EXISTS (
      SELECT 1 FROM tranches
      WHERE eleve_id = _eleve_id AND frais_id <> v_frais_id
        AND EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id)
    ) THEN
      -- Il reste des tranches d'un autre frais AVEC paiements : on ne touche à rien,
      -- pour préserver l'historique comptable. On sort sans doublonner.
      RETURN;
    END IF;

    DELETE FROM tranches
      WHERE eleve_id = _eleve_id AND frais_id <> v_frais_id;

    -- Si l'échéancier cible existe déjà (même frais), ne rien recréer.
    IF EXISTS (SELECT 1 FROM tranches WHERE eleve_id = _eleve_id AND frais_id = v_frais_id) THEN
      RETURN;
    END IF;

    FOR t IN SELECT * FROM jsonb_array_elements(v_grille.tranches) LOOP
      v_idx := v_idx + 1;
      v_mois := COALESCE((t->>'mois')::int, 10);
      v_jour := COALESCE((t->>'jour')::int, 15);
      v_year := CASE WHEN v_mois >= 8 THEN EXTRACT(YEAR FROM v_annee_debut)::int
                                       ELSE EXTRACT(YEAR FROM v_annee_fin)::int END;
      BEGIN
        v_date := make_date(v_year, v_mois, v_jour);
      EXCEPTION WHEN OTHERS THEN v_date := v_annee_debut; END;

      INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
      VALUES (
        v_ecole, _eleve_id, v_frais_id, v_idx,
        COALESCE(t->>'label', v_idx || 'e tranche'),
        v_date,
        (t->>'montant')::numeric,
        0,
        CASE WHEN v_date < CURRENT_DATE THEN 'retard'::tranche_statut ELSE 'due'::tranche_statut END
      );
    END LOOP;
    RETURN;
  END IF;

  -- Fallback : par cycle
  IF v_cycle IS NULL THEN RETURN; END IF;
  SELECT * INTO v_frais FROM frais_scolarite
   WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM tranches
    WHERE eleve_id = _eleve_id AND frais_id <> v_frais.id
      AND EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id)
  ) THEN RETURN; END IF;

  DELETE FROM tranches WHERE eleve_id = _eleve_id AND frais_id <> v_frais.id;

  IF EXISTS (SELECT 1 FROM tranches WHERE eleve_id = _eleve_id AND frais_id = v_frais.id) THEN RETURN; END IF;

  DECLARE
    v_dates date[]; v_labels text[] := ARRAY['1ere tranche','2eme tranche','3eme tranche'];
    v_montant numeric; i int;
  BEGIN
    v_dates := ARRAY[
      make_date(EXTRACT(YEAR FROM v_annee_debut)::int, 10, 15),
      make_date(EXTRACT(YEAR FROM v_annee_fin)::int, 1, 15),
      make_date(EXTRACT(YEAR FROM v_annee_fin)::int, 4, 15)
    ];
    v_montant := ROUND(v_frais.montant_annuel / GREATEST(v_frais.nb_tranches,1));
    FOR i IN 1..LEAST(v_frais.nb_tranches, 3) LOOP
      INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
      VALUES (v_ecole, _eleve_id, v_frais.id, i, v_labels[i], v_dates[i],
        CASE WHEN i = v_frais.nb_tranches THEN v_frais.montant_annuel - v_montant*(i-1) ELSE v_montant END,
        0,
        CASE WHEN v_dates[i] < CURRENT_DATE THEN 'retard'::tranche_statut ELSE 'due'::tranche_statut END);
    END LOOP;
  END;
END;
$function$;
