CREATE OR REPLACE FUNCTION public.executer_passage_classe(
  _ecole_id uuid,
  _annee_source uuid,
  _annee_cible uuid,
  _plan jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grp jsonb;
  v_eleve jsonb;
  v_classe_src uuid;
  v_classe_cible uuid;
  v_action_defaut text;
  v_action text;
  v_new_id uuid;
  v_eleve_id uuid;
  v_target_classe uuid;
  v_passage_id uuid;
  v_new_ids uuid[] := '{}';
  v_promus int := 0;
  v_redoubles int := 0;
  v_exclus int := 0;
  v_sortants int := 0;
  v_annee_source_statut text;
  v_annee_cible_statut text;
  v_grille_dupliquees int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Acces refuse : admin ou directeur requis';
  END IF;

  SELECT statut::text INTO v_annee_source_statut FROM annees_scolaires
    WHERE id = _annee_source AND ecole_id = _ecole_id;
  SELECT statut::text INTO v_annee_cible_statut FROM annees_scolaires
    WHERE id = _annee_cible AND ecole_id = _ecole_id;
  IF v_annee_source_statut IS NULL OR v_annee_cible_statut IS NULL THEN
    RAISE EXCEPTION 'Annee source ou cible introuvable';
  END IF;
  IF v_annee_cible_statut = 'cloturee' THEN
    RAISE EXCEPTION 'Annee cible cloturee : impossible d y creer des inscriptions';
  END IF;
  IF _annee_source = _annee_cible THEN
    RAISE EXCEPTION 'L annee source et cible doivent etre differentes';
  END IF;

  -- Duplique la grille tarifaire par niveau si l'annee cible n'en a pas.
  -- L'insertion des nouveaux eleves declenchera alors le trigger
  -- eleves_generer_tranches qui cree l'echeancier de chaque pre-inscrit.
  IF NOT EXISTS (
    SELECT 1 FROM grille_tarifs_niveaux
     WHERE ecole_id = _ecole_id AND annee_id = _annee_cible
  ) THEN
    INSERT INTO grille_tarifs_niveaux (ecole_id, annee_id, niveau_code, variant, libelle, tranches)
    SELECT ecole_id, _annee_cible, niveau_code, variant, libelle, tranches
      FROM grille_tarifs_niveaux
     WHERE ecole_id = _ecole_id AND annee_id = _annee_source;
    GET DIAGNOSTICS v_grille_dupliquees = ROW_COUNT;
  END IF;

  FOR v_grp IN SELECT jsonb_array_elements(_plan) LOOP
    v_classe_src := NULLIF(v_grp->>'classe_source_id','')::uuid;
    v_classe_cible := NULLIF(v_grp->>'classe_cible_id','')::uuid;
    v_action_defaut := COALESCE(v_grp->>'action_defaut','promu');

    FOR v_eleve IN SELECT jsonb_array_elements(COALESCE(v_grp->'eleves','[]'::jsonb)) LOOP
      v_eleve_id := (v_eleve->>'eleve_id')::uuid;
      v_action := COALESCE(v_eleve->>'action', v_action_defaut);

      IF EXISTS (SELECT 1 FROM eleves
                 WHERE ecole_id = _ecole_id AND annee_id = _annee_cible
                   AND matricule = (SELECT matricule FROM eleves WHERE id = v_eleve_id)) THEN
        CONTINUE;
      END IF;

      IF v_action IN ('exclu','sortant') THEN
        INSERT INTO parcours_scolaire (ecole_id, eleve_id, annee_id, classe_id, decision)
        VALUES (_ecole_id, v_eleve_id, _annee_source, v_classe_src,
                CASE WHEN v_action='exclu' THEN 'exclusion' ELSE 'transfert' END)
        ON CONFLICT (ecole_id, eleve_id, annee_id) DO NOTHING;
        IF v_action = 'exclu' THEN v_exclus := v_exclus + 1;
        ELSE v_sortants := v_sortants + 1; END IF;
        CONTINUE;
      END IF;

      IF v_action = 'redouble' THEN
        SELECT c2.id INTO v_target_classe
        FROM classes c1
        JOIN classes c2 ON c2.ecole_id = _ecole_id AND c2.annee_id = _annee_cible AND c2.nom = c1.nom
        WHERE c1.id = v_classe_src
        LIMIT 1;
      ELSE
        v_target_classe := COALESCE(NULLIF(v_eleve->>'classe_cible_id','')::uuid, v_classe_cible);
      END IF;

      INSERT INTO eleves (ecole_id, annee_id, classe_id, nom, prenom, date_naissance,
        lieu_naissance, sexe, nationalite, adresse, photo_url, statut,
        matricule, matricule_national, numero_inscription_en_ligne, est_nouveau)
      SELECT ecole_id, _annee_cible, v_target_classe, nom, prenom, date_naissance,
        lieu_naissance, sexe, nationalite, adresse, photo_url, 'pre_inscrit',
        matricule, matricule_national, numero_inscription_en_ligne, false
      FROM eleves WHERE id = v_eleve_id
      RETURNING id INTO v_new_id;

      v_new_ids := array_append(v_new_ids, v_new_id);

      INSERT INTO parcours_scolaire (ecole_id, eleve_id, annee_id, classe_id, decision, classe_destination_id)
      VALUES (_ecole_id, v_eleve_id, _annee_source, v_classe_src,
              CASE WHEN v_action='redouble' THEN 'redoublement' ELSE 'passage' END,
              v_target_classe)
      ON CONFLICT (ecole_id, eleve_id, annee_id) DO NOTHING;

      IF v_action = 'redouble' THEN v_redoubles := v_redoubles + 1;
      ELSE v_promus := v_promus + 1; END IF;
    END LOOP;
  END LOOP;

  INSERT INTO passages_classe (ecole_id, annee_source, annee_cible, plan, resultat, eleves_cibles_ids, execute_par)
  VALUES (_ecole_id, _annee_source, _annee_cible, _plan,
          jsonb_build_object('promus', v_promus, 'redoubles', v_redoubles, 'exclus', v_exclus,
                             'sortants', v_sortants, 'grilles_dupliquees', v_grille_dupliquees),
          v_new_ids, auth.uid())
  RETURNING id INTO v_passage_id;

  RETURN jsonb_build_object(
    'passage_id', v_passage_id,
    'promus', v_promus,
    'redoubles', v_redoubles,
    'exclus', v_exclus,
    'sortants', v_sortants,
    'grilles_dupliquees', v_grille_dupliquees,
    'nouvelles_inscriptions', array_length(v_new_ids, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.executer_passage_classe(uuid, uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.executer_passage_classe(uuid, uuid, uuid, jsonb) TO authenticated;