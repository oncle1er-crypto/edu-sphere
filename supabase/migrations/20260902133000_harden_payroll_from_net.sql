-- Sécurise la génération à rebours : le net enregistré doit être exactement
-- celui demandé. Aucun ajustement comptable implicite n'est autorisé.
CREATE OR REPLACE FUNCTION public.rh_bulletin_depuis_net(
  _ecole_id uuid,
  _personnel_id uuid,
  _mois integer,
  _annee integer,
  _net_cible numeric
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  calc jsonb;
  l jsonb;
  v_id uuid;
  lo bigint := 0;
  hi bigint;
  mid bigint;
  v_net numeric;
  v_trouve boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::public.app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _mois NOT BETWEEN 1 AND 12 OR _annee NOT BETWEEN 2000 AND 2200 THEN
    RAISE EXCEPTION 'periode_invalide';
  END IF;
  IF COALESCE(_net_cible, 0) <= 0
     OR _net_cible <> round(_net_cible)
     OR _net_cible > 1000000000000 THEN
    RAISE EXCEPTION 'net_invalide';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.enseignants e
    WHERE e.id = _personnel_id
      AND e.ecole_id = _ecole_id
      AND e.statut = 'actif'
  ) THEN
    RAISE EXCEPTION 'personnel_introuvable';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.bulletins_paie b
    WHERE b.ecole_id = _ecole_id
      AND b.enseignant_id = _personnel_id
      AND b.mois = _mois
      AND b.annee = _annee
  ) THEN
    RAISE EXCEPTION 'bulletin_existe_deja';
  END IF;

  -- Recherche sur des bases entières : le bulletin n'est créé que si les
  -- barèmes permettent d'obtenir exactement le net demandé.
  hi := ceil(_net_cible * 3 + 1000000)::bigint;
  WHILE lo <= hi LOOP
    mid := (lo + hi) / 2;
    calc := public.rh_calculer_bulletin(_ecole_id, _personnel_id, _mois, _annee, mid);
    IF (calc->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'calcul_impossible';
    END IF;
    v_net := (calc->>'net_a_payer')::numeric;
    IF v_net = _net_cible THEN
      v_trouve := true;
      EXIT;
    ELSIF v_net < _net_cible THEN
      lo := mid + 1;
    ELSE
      hi := mid - 1;
    END IF;
  END LOOP;

  IF NOT v_trouve THEN
    RAISE EXCEPTION 'net_cible_inatteignable';
  END IF;

  INSERT INTO public.bulletins_paie (
    ecole_id, enseignant_id, mois, annee, statut, salaire_brut, retenues,
    net_a_payer, total_gains, brut_imposable, base_cnps,
    total_charges_patronales, cout_employeur, anciennete_annees, notes
  ) VALUES (
    _ecole_id, _personnel_id, _mois, _annee, 'brouillon',
    (calc->>'total_gains')::numeric, (calc->>'total_retenues')::numeric,
    (calc->>'net_a_payer')::numeric, (calc->>'total_gains')::numeric,
    (calc->>'brut_imposable')::numeric, (calc->>'base_cnps')::numeric,
    (calc->>'total_charges_patronales')::numeric,
    (calc->>'cout_employeur')::numeric, (calc->>'anciennete_annees')::integer,
    'Bulletin calculé à rebours depuis un net à payer cible de '
      || round(_net_cible)::text || ' FCFA'
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

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    _ecole_id, auth.uid(), 'paie.bulletin_depuis_net',
    _mois || '/' || _annee, 'info',
    jsonb_build_object(
      'bulletin_id', v_id,
      'net_cible', _net_cible,
      'net_obtenu', (calc->>'net_a_payer')::numeric,
      'salaire_base_calcule', mid
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'bulletin_id', v_id,
    'net_a_payer', (calc->>'net_a_payer')::numeric,
    'total_gains', (calc->>'total_gains')::numeric
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rh_bulletin_depuis_net(uuid, uuid, integer, integer, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_bulletin_depuis_net(uuid, uuid, integer, integer, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.rh_bulletin_depuis_net(uuid, uuid, integer, integer, numeric) TO authenticated;
