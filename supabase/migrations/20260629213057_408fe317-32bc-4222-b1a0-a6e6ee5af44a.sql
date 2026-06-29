
-- 1) Promotion des élèves
CREATE OR REPLACE FUNCTION public.promouvoir_eleves_annee(
  _ecole_id uuid, _annee_source uuid, _annee_cible uuid,
  _mapping jsonb DEFAULT '{}'::jsonb,
  _mode text DEFAULT 'auto'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eleve RECORD; v_target_classe uuid; v_count_promus int := 0;
  v_count_redoubles int := 0; v_count_skip int := 0;
  v_source_classe_nom text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin/directeur requis';
  END IF;

  FOR v_eleve IN
    SELECT e.id, e.classe_id, e.statut, c.nom AS classe_nom
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.ecole_id = _ecole_id AND e.annee_id = _annee_source
      AND e.statut NOT IN ('exclu', 'transfere')
  LOOP
    -- Éviter doublon si déjà promu
    IF EXISTS (SELECT 1 FROM eleves WHERE ecole_id = _ecole_id AND annee_id = _annee_cible
               AND nom IN (SELECT nom FROM eleves WHERE id = v_eleve.id)
               AND prenom IN (SELECT prenom FROM eleves WHERE id = v_eleve.id)) THEN
      v_count_skip := v_count_skip + 1;
      CONTINUE;
    END IF;

    v_source_classe_nom := v_eleve.classe_nom;
    v_target_classe := NULL;

    -- Cherche dans mapping fourni (clé = nom classe source, valeur = id classe cible)
    IF _mapping ? v_source_classe_nom THEN
      v_target_classe := (_mapping ->> v_source_classe_nom)::uuid;
    ELSE
      -- mapping par défaut : même nom de classe
      SELECT id INTO v_target_classe FROM classes
       WHERE ecole_id = _ecole_id AND nom = v_source_classe_nom LIMIT 1;
    END IF;

    -- Crée nouvelle ligne élève dans année cible
    INSERT INTO eleves (ecole_id, annee_id, classe_id, nom, prenom, date_naissance,
      lieu_naissance, sexe, adresse, telephone, email, photo_url, statut,
      matricule, matricule_national, numero_inscription_en_ligne, est_nouveau)
    SELECT ecole_id, _annee_cible, v_target_classe, nom, prenom, date_naissance,
      lieu_naissance, sexe, adresse, telephone, email, photo_url, 'pre_inscrit',
      matricule, matricule_national, numero_inscription_en_ligne, false
    FROM eleves WHERE id = v_eleve.id;

    INSERT INTO parcours_scolaire (ecole_id, eleve_id, annee_id, classe_id, decision, classe_destination_id)
    VALUES (_ecole_id, v_eleve.id, _annee_source, v_eleve.classe_id, 'passage', v_target_classe)
    ON CONFLICT (ecole_id, eleve_id, annee_id) DO NOTHING;

    v_count_promus := v_count_promus + 1;
  END LOOP;

  RETURN jsonb_build_object('promus', v_count_promus, 'redoubles', v_count_redoubles, 'ignores', v_count_skip);
END;
$$;

-- 2) Reconduction affectations pédagogiques
CREATE OR REPLACE FUNCTION public.reconduire_affectations_pedagogiques(
  _ecole_id uuid, _annee_source uuid, _annee_cible uuid,
  _options jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cm int := 0; v_em int := 0; v_cr int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF COALESCE((_options->>'classe_matieres')::boolean, false) THEN
    INSERT INTO classe_matieres (ecole_id, annee_id, classe_id, matiere_id, volume_horaire_hebdo, coefficient)
    SELECT ecole_id, _annee_cible, classe_id, matiere_id, volume_horaire_hebdo, coefficient
    FROM classe_matieres WHERE ecole_id = _ecole_id AND annee_id = _annee_source
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_cm = ROW_COUNT;
  END IF;

  IF COALESCE((_options->>'enseignant_matieres')::boolean, false) THEN
    INSERT INTO enseignant_matieres (ecole_id, annee_id, enseignant_id, matiere_id, classe_id)
    SELECT ecole_id, _annee_cible, enseignant_id, matiere_id, classe_id
    FROM enseignant_matieres WHERE ecole_id = _ecole_id AND annee_id = _annee_source
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_em = ROW_COUNT;
  END IF;

  IF COALESCE((_options->>'creneaux')::boolean, false) THEN
    INSERT INTO creneaux_emploi_temps (ecole_id, annee_id, classe_id, matiere_id, enseignant_id,
      salle_id, salle, jour, heure_debut, heure_fin, type_creneau)
    SELECT ecole_id, _annee_cible, classe_id, matiere_id, enseignant_id,
      salle_id, salle, jour, heure_debut, heure_fin, type_creneau
    FROM creneaux_emploi_temps WHERE ecole_id = _ecole_id AND annee_id = _annee_source;
    GET DIAGNOSTICS v_cr = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('classe_matieres', v_cm, 'enseignant_matieres', v_em, 'creneaux', v_cr);
END;
$$;

-- 3) Renouvellement abonnements
CREATE OR REPLACE FUNCTION public.renouveler_abonnements(
  _ecole_id uuid, _annee_source uuid, _annee_cible uuid, _types text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cant int := 0; v_tr int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF 'cantine' = ANY(_types) THEN
    INSERT INTO abonnements_cantine (ecole_id, annee_id, eleve_id, formule, date_debut, date_fin, statut)
    SELECT a.ecole_id, _annee_cible, e_new.id, a.formule, a.date_debut, a.date_fin, 'actif'
    FROM abonnements_cantine a
    JOIN eleves e_old ON e_old.id = a.eleve_id
    JOIN eleves e_new ON e_new.ecole_id = a.ecole_id AND e_new.annee_id = _annee_cible
                    AND e_new.nom = e_old.nom AND e_new.prenom = e_old.prenom
    WHERE a.ecole_id = _ecole_id AND a.annee_id = _annee_source AND a.statut = 'actif';
    GET DIAGNOSTICS v_cant = ROW_COUNT;
  END IF;

  IF 'transport' = ANY(_types) THEN
    INSERT INTO abonnements_transport (ecole_id, annee_id, eleve_id, ligne_id, statut)
    SELECT a.ecole_id, _annee_cible, e_new.id, a.ligne_id, 'actif'
    FROM abonnements_transport a
    JOIN eleves e_old ON e_old.id = a.eleve_id
    JOIN eleves e_new ON e_new.ecole_id = a.ecole_id AND e_new.annee_id = _annee_cible
                    AND e_new.nom = e_old.nom AND e_new.prenom = e_old.prenom
    WHERE a.ecole_id = _ecole_id AND a.annee_id = _annee_source AND a.statut = 'actif';
    GET DIAGNOSTICS v_tr = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('cantine', v_cant, 'transport', v_tr);
END;
$$;

-- 4) Activation année
CREATE OR REPLACE FUNCTION public.activer_annee_scolaire(_ecole_id uuid, _annee_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE annees_scolaires SET statut = 'verrouillee'
   WHERE ecole_id = _ecole_id AND statut = 'active' AND id <> _annee_id;
  UPDATE annees_scolaires SET statut = 'active'
   WHERE ecole_id = _ecole_id AND id = _annee_id;
END;
$$;
