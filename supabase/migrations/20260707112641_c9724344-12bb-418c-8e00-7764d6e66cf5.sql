
-- 1. Ajouter la valeur 'cloturee' à l'enum annee_statut
ALTER TYPE public.annee_statut ADD VALUE IF NOT EXISTS 'cloturee';

-- 2. Table journal des passages de classe (réversible)
CREATE TABLE IF NOT EXISTS public.passages_classe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  annee_source uuid NOT NULL,
  annee_cible uuid NOT NULL,
  plan jsonb NOT NULL,
  resultat jsonb,
  eleves_cibles_ids uuid[] NOT NULL DEFAULT '{}',
  execute_par uuid,
  execute_le timestamptz NOT NULL DEFAULT now(),
  annule_le timestamptz,
  annule_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.passages_classe TO authenticated;
GRANT ALL ON public.passages_classe TO service_role;

ALTER TABLE public.passages_classe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passages_classe_select"
  ON public.passages_classe FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "passages_classe_service_write"
  ON public.passages_classe FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_passages_classe_ecole_source
  ON public.passages_classe(ecole_id, annee_source);

-- 3. RPC : exécuter un passage de classe
-- _plan format : [
--   {
--     "classe_source_id": "uuid",
--     "classe_cible_id": "uuid" | null,
--     "action_defaut": "promu" | "redouble" | "sortant",
--     "eleves": [
--       { "eleve_id": "uuid", "action": "promu|redouble|exclu|sortant", "classe_cible_id": "uuid" }
--     ]
--   }
-- ]
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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin ou directeur requis';
  END IF;

  SELECT statut::text INTO v_annee_source_statut FROM annees_scolaires
    WHERE id = _annee_source AND ecole_id = _ecole_id;
  SELECT statut::text INTO v_annee_cible_statut FROM annees_scolaires
    WHERE id = _annee_cible AND ecole_id = _ecole_id;
  IF v_annee_source_statut IS NULL OR v_annee_cible_statut IS NULL THEN
    RAISE EXCEPTION 'Année source ou cible introuvable';
  END IF;
  IF v_annee_cible_statut = 'cloturee' THEN
    RAISE EXCEPTION 'Année cible clôturée : impossible d''y créer des inscriptions';
  END IF;
  IF _annee_source = _annee_cible THEN
    RAISE EXCEPTION 'L''année source et cible doivent être différentes';
  END IF;

  FOR v_grp IN SELECT jsonb_array_elements(_plan) LOOP
    v_classe_src := NULLIF(v_grp->>'classe_source_id','')::uuid;
    v_classe_cible := NULLIF(v_grp->>'classe_cible_id','')::uuid;
    v_action_defaut := COALESCE(v_grp->>'action_defaut','promu');

    FOR v_eleve IN SELECT jsonb_array_elements(COALESCE(v_grp->'eleves','[]'::jsonb)) LOOP
      v_eleve_id := (v_eleve->>'eleve_id')::uuid;
      v_action := COALESCE(v_eleve->>'action', v_action_defaut);

      -- Skip si déjà inscrit dans l'année cible
      IF EXISTS (SELECT 1 FROM eleves
                 WHERE ecole_id = _ecole_id AND annee_id = _annee_cible
                   AND matricule = (SELECT matricule FROM eleves WHERE id = v_eleve_id)) THEN
        CONTINUE;
      END IF;

      IF v_action IN ('exclu','sortant') THEN
        -- Pas de réinscription. Trace uniquement.
        INSERT INTO parcours_scolaire (ecole_id, eleve_id, annee_id, classe_id, decision)
        VALUES (_ecole_id, v_eleve_id, _annee_source, v_classe_src,
                CASE WHEN v_action='exclu' THEN 'exclusion' ELSE 'transfert' END)
        ON CONFLICT (ecole_id, eleve_id, annee_id) DO NOTHING;
        IF v_action = 'exclu' THEN v_exclus := v_exclus + 1;
        ELSE v_sortants := v_sortants + 1; END IF;
        CONTINUE;
      END IF;

      -- Choix de la classe cible
      IF v_action = 'redouble' THEN
        -- Cherche une classe portant le même nom dans l'année cible
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

  -- Journal
  INSERT INTO passages_classe (ecole_id, annee_source, annee_cible, plan, resultat, eleves_cibles_ids, execute_par)
  VALUES (_ecole_id, _annee_source, _annee_cible, _plan,
          jsonb_build_object('promus', v_promus, 'redoubles', v_redoubles, 'exclus', v_exclus, 'sortants', v_sortants),
          v_new_ids, auth.uid())
  RETURNING id INTO v_passage_id;

  RETURN jsonb_build_object(
    'passage_id', v_passage_id,
    'promus', v_promus,
    'redoubles', v_redoubles,
    'exclus', v_exclus,
    'sortants', v_sortants,
    'nouvelles_inscriptions', array_length(v_new_ids, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.executer_passage_classe(uuid, uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.executer_passage_classe(uuid, uuid, uuid, jsonb) TO authenticated;

-- 4. RPC : clôturer une année
CREATE OR REPLACE FUNCTION public.cloturer_annee(_ecole_id uuid, _annee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin ou directeur requis';
  END IF;
  UPDATE annees_scolaires SET statut = 'cloturee', updated_at = now()
    WHERE id = _annee_id AND ecole_id = _ecole_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cloturer_annee(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cloturer_annee(uuid, uuid) TO authenticated;

-- 5. RPC : restaurer / rouvrir une année clôturée ou verrouillée
CREATE OR REPLACE FUNCTION public.restaurer_annee(_ecole_id uuid, _annee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;
  UPDATE annees_scolaires SET statut = 'verrouillee', updated_at = now()
    WHERE id = _annee_id AND ecole_id = _ecole_id
      AND statut IN ('cloturee','archivee');
END;
$$;

REVOKE ALL ON FUNCTION public.restaurer_annee(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.restaurer_annee(uuid, uuid) TO authenticated;

-- 6. RPC : annuler un passage journalisé (rollback)
CREATE OR REPLACE FUNCTION public.annuler_passage_classe(_passage_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passage RECORD;
  v_deleted int := 0;
  v_cible_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  SELECT * INTO v_passage FROM passages_classe WHERE id = _passage_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Passage introuvable'; END IF;

  IF NOT (private.has_ecole_role(auth.uid(), v_passage.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_passage.ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin ou directeur requis';
  END IF;
  IF v_passage.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'Passage déjà annulé';
  END IF;

  SELECT statut::text INTO v_cible_statut FROM annees_scolaires WHERE id = v_passage.annee_cible;
  IF v_cible_statut = 'cloturee' THEN
    RAISE EXCEPTION 'Année cible clôturée : annulation impossible';
  END IF;

  -- Supprime les inscriptions créées par ce passage
  DELETE FROM eleves WHERE id = ANY(v_passage.eleves_cibles_ids) AND annee_id = v_passage.annee_cible;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Nettoie les entrées de parcours créées par ce passage
  DELETE FROM parcours_scolaire
    WHERE ecole_id = v_passage.ecole_id
      AND annee_id = v_passage.annee_source
      AND eleve_id IN (
        SELECT (e->>'eleve_id')::uuid
        FROM jsonb_array_elements(v_passage.plan) grp,
             jsonb_array_elements(COALESCE(grp->'eleves','[]'::jsonb)) e
      );

  UPDATE passages_classe
    SET annule_le = now(), annule_par = auth.uid(), updated_at = now()
    WHERE id = _passage_id;

  RETURN jsonb_build_object('inscriptions_supprimees', v_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.annuler_passage_classe(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.annuler_passage_classe(uuid) TO authenticated;
