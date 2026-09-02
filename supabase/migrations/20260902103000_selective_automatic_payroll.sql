-- Génération automatique sélective des bulletins de paie.
-- La fonction historique reste disponible pour compatibilité, mais l'interface
-- appelle désormais cette variante qui exige une sélection explicite.
CREATE OR REPLACE FUNCTION public.rh_generer_brouillons_selection(
  _ecole_id uuid,
  _mois integer,
  _annee integer,
  _personnel_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  r RECORD;
  calc jsonb;
  l jsonb;
  v_id uuid;
  n integer := 0;
  n_deja integer := 0;
  n_invalides integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _mois NOT BETWEEN 1 AND 12 OR _annee NOT BETWEEN 2000 AND 2200 THEN
    RAISE EXCEPTION 'periode_invalide';
  END IF;

  IF COALESCE(cardinality(_personnel_ids), 0) = 0 THEN
    RAISE EXCEPTION 'selection_vide';
  END IF;

  -- Refuser entièrement une sélection altérée : aucun identifiant d'une autre
  -- école, inactif ou inexistant ne doit être ignoré silencieusement.
  IF EXISTS (
    SELECT 1
    FROM unnest(_personnel_ids) AS selection(personnel_id)
    LEFT JOIN public.enseignants e
      ON e.id = selection.personnel_id
     AND e.ecole_id = _ecole_id
     AND e.statut = 'actif'
    WHERE e.id IS NULL
  ) THEN
    RAISE EXCEPTION 'selection_invalide';
  END IF;

  FOR r IN
    SELECT DISTINCT e.id
    FROM public.enseignants e
    JOIN unnest(_personnel_ids) AS selection(personnel_id)
      ON selection.personnel_id = e.id
    WHERE e.ecole_id = _ecole_id
      AND e.statut = 'actif'
    ORDER BY e.id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.bulletins_paie b
      WHERE b.ecole_id = _ecole_id
        AND b.enseignant_id = r.id
        AND b.mois = _mois
        AND b.annee = _annee
    ) THEN
      n_deja := n_deja + 1;
      CONTINUE;
    END IF;

    calc := public.rh_calculer_bulletin(_ecole_id, r.id, _mois, _annee);
    IF (calc->>'ok')::boolean IS NOT TRUE
       OR COALESCE((calc->>'total_gains')::numeric, 0) <= 0 THEN
      n_invalides := n_invalides + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.bulletins_paie (
      ecole_id, enseignant_id, mois, annee, statut, salaire_brut, retenues,
      net_a_payer, total_gains, brut_imposable, base_cnps,
      total_charges_patronales, cout_employeur, anciennete_annees
    ) VALUES (
      _ecole_id, r.id, _mois, _annee, 'brouillon',
      (calc->>'total_gains')::numeric, (calc->>'total_retenues')::numeric,
      (calc->>'net_a_payer')::numeric, (calc->>'total_gains')::numeric,
      (calc->>'brut_imposable')::numeric, (calc->>'base_cnps')::numeric,
      (calc->>'total_charges_patronales')::numeric,
      (calc->>'cout_employeur')::numeric, (calc->>'anciennete_annees')::integer
    ) RETURNING id INTO v_id;

    FOR l IN SELECT * FROM jsonb_array_elements(calc->'lignes')
    LOOP
      INSERT INTO public.rh_bulletin_lignes (
        ecole_id, bulletin_id, rubrique_code, libelle, type,
        base, taux, montant, ordre
      ) VALUES (
        _ecole_id, v_id, l->>'code', l->>'libelle', l->>'type',
        COALESCE((l->>'base')::numeric, 0), (l->>'taux')::numeric,
        (l->>'montant')::numeric, COALESCE((l->>'ordre')::integer, 0)
      );
    END LOOP;
    n := n + 1;
  END LOOP;

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    _ecole_id, auth.uid(), 'paie.generer_brouillons_selection',
    _mois || '/' || _annee, 'info',
    jsonb_build_object(
      'personnels_demandes', cardinality(_personnel_ids),
      'bulletins_crees', n,
      'deja_crees', n_deja,
      'dossiers_invalides', n_invalides
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'crees', n,
    'deja_crees', n_deja,
    'invalides', n_invalides
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rh_generer_brouillons_selection(uuid, integer, integer, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_generer_brouillons_selection(uuid, integer, integer, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.rh_generer_brouillons_selection(uuid, integer, integer, uuid[]) TO authenticated;
