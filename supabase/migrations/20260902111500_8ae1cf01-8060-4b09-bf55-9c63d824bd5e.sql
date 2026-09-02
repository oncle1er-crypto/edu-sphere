-- 1. Paramètres de prime de transport par école
INSERT INTO public.rh_parametres (ecole_id, groupe, cle, libelle, valeur, unite, ordre)
SELECT e.id, 'primes', 'prime_transport_mensuelle', 'Prime de transport mensuelle', 30000, 'montant', 1
FROM public.ecoles e
ON CONFLICT (ecole_id, cle) DO NOTHING;

INSERT INTO public.rh_parametres (ecole_id, groupe, cle, libelle, valeur, unite, ordre)
SELECT e.id, 'primes', 'prime_transport_plafond_exonere', 'Plafond exonéré de la prime de transport', 30000, 'montant', 2
FROM public.ecoles e
ON CONFLICT (ecole_id, cle) DO NOTHING;

-- 2. Moteur de calcul : ancienneté depuis le contrat, prime de transport, base forçable
DROP FUNCTION IF EXISTS public.rh_calculer_bulletin(uuid, uuid, integer, integer);

CREATE FUNCTION public.rh_calculer_bulletin(
  _ecole_id uuid,
  _personnel_id uuid,
  _mois integer,
  _annee integer,
  _base_override numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD; c RECORD;
  v_par jsonb; v_lignes jsonb := '[]'::jsonb; v_alertes jsonb := '[]'::jsonb;
  v_base numeric; v_anc_annees int := 0; v_anc_taux numeric := 0; v_anc numeric := 0;
  v_gains numeric := 0; v_imposable numeric := 0; v_base_cnps numeric := 0;
  v_plafond numeric; v_cnps_sal numeric; v_cmu_sal numeric; v_irpp numeric := 0;
  v_retenues numeric := 0; v_patronales numeric := 0; v_net numeric;
  v_parts numeric; v_quotient numeric; v_reste numeric; t RECORD;
  v_embauche date;
  v_transport numeric := 0; v_transport_plafond numeric := 0;
  v_transport_impos numeric := 0; v_transport_source text := 'parametre';
BEGIN
  SELECT * INTO p FROM enseignants WHERE id = _personnel_id AND ecole_id = _ecole_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'raison', 'personnel_introuvable'); END IF;

  SELECT jsonb_object_agg(cle, valeur) INTO v_par FROM rh_parametres WHERE ecole_id = _ecole_id;
  IF v_par IS NULL THEN RETURN jsonb_build_object('ok', false, 'raison', 'parametres_absents'); END IF;

  -- Salaire de base : base forcée > contrat actif > fiche
  SELECT * INTO c FROM contrats_enseignants
   WHERE enseignant_id = _personnel_id AND statut = 'actif'
   ORDER BY date_debut DESC LIMIT 1;

  IF _base_override IS NOT NULL THEN
    v_base := ROUND(_base_override);
  ELSE
    v_base := COALESCE(NULLIF(c.salaire_base, 0), NULLIF(p.salaire_brut_base, 0), 0);
    IF c.quotite IS NOT NULL AND c.quotite > 0 THEN
      v_base := ROUND(v_base * c.quotite / 100);
    END IF;
  END IF;

  IF v_base <= 0 THEN
    v_alertes := v_alertes || to_jsonb('Aucun salaire de base défini (contrat ou fiche)'::text);
  END IF;

  -- Ancienneté : date d'embauche de la fiche, à défaut début du contrat
  v_embauche := COALESCE(p.date_embauche, c.date_debut);
  IF v_embauche IS NULL THEN
    v_alertes := v_alertes || to_jsonb('Date d''embauche absente : ancienneté calculée à zéro'::text);
  ELSE
    v_anc_annees := GREATEST(0, EXTRACT(YEAR FROM age(make_date(_annee, _mois, 1), v_embauche))::int);
  END IF;
  SELECT taux INTO v_anc_taux FROM rh_bareme_anciennete
   WHERE ecole_id = _ecole_id AND annees_min <= v_anc_annees
   ORDER BY annees_min DESC LIMIT 1;
  v_anc_taux := COALESCE(v_anc_taux, 0);
  v_anc := ROUND(v_base * v_anc_taux / 100);

  IF p.numero_cnps IS NULL OR btrim(p.numero_cnps) = '' THEN
    v_alertes := v_alertes || to_jsonb('Numéro CNPS non renseigné'::text);
  END IF;

  -- ── GAINS ──
  v_lignes := v_lignes || jsonb_build_object('code','salaire_base','libelle','Salaire de base',
    'type','gain','base',v_base,'taux',NULL,'montant',v_base,'ordre',1);
  v_gains := v_base; v_imposable := v_base; v_base_cnps := v_base;

  IF v_anc > 0 THEN
    v_lignes := v_lignes || jsonb_build_object('code','prime_anciennete','libelle','Prime d''ancienneté',
      'type','gain','base',v_base,'taux',v_anc_taux,'montant',v_anc,'ordre',3);
    v_gains := v_gains + v_anc; v_imposable := v_imposable + v_anc; v_base_cnps := v_base_cnps + v_anc;
  END IF;

  -- Prime de transport : montant du contrat s'il existe, sinon paramètre de l'école
  IF c.primes IS NOT NULL AND jsonb_typeof(c.primes) = 'array' THEN
    SELECT COALESCE((x.v->>'montant')::numeric, 0) INTO v_transport
    FROM jsonb_array_elements(c.primes) AS x(v)
    WHERE COALESCE(x.v->>'libelle','') ILIKE '%transport%'
    LIMIT 1;
    IF v_transport IS NOT NULL AND v_transport > 0 THEN
      v_transport_source := 'contrat';
    END IF;
  END IF;
  IF COALESCE(v_transport, 0) <= 0 THEN
    v_transport := COALESCE((v_par->>'prime_transport_mensuelle')::numeric, 0);
    v_transport_source := 'parametre';
  END IF;
  v_transport := ROUND(COALESCE(v_transport, 0));
  v_transport_plafond := COALESCE((v_par->>'prime_transport_plafond_exonere')::numeric, 30000);

  IF v_transport > 0 THEN
    -- La fraction dépassant le plafond légal est imposable et soumise CNPS
    v_transport_impos := GREATEST(v_transport - v_transport_plafond, 0);
    v_lignes := v_lignes || jsonb_build_object('code','prime_transport','libelle','Prime de transport',
      'type','gain','base',NULL,'taux',NULL,'montant',v_transport,'ordre',2);
    v_gains := v_gains + v_transport;
    v_imposable := v_imposable + v_transport_impos;
    v_base_cnps := v_base_cnps + v_transport_impos;
  END IF;

  -- Autres primes du contrat : imposables et soumises CNPS par défaut
  IF c.primes IS NOT NULL AND jsonb_typeof(c.primes) = 'array' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(c.primes) AS x(v) LOOP
      CONTINUE WHEN v_transport_source = 'contrat'
                AND COALESCE(t.v->>'libelle','') ILIKE '%transport%';
      IF COALESCE((t.v->>'montant')::numeric, 0) > 0 THEN
        v_lignes := v_lignes || jsonb_build_object('code','prime_exceptionnelle',
          'libelle', COALESCE(t.v->>'libelle','Prime'), 'type','gain','base',NULL,'taux',NULL,
          'montant',(t.v->>'montant')::numeric,'ordre',8);
        v_gains := v_gains + (t.v->>'montant')::numeric;
        v_imposable := v_imposable + (t.v->>'montant')::numeric;
        v_base_cnps := v_base_cnps + (t.v->>'montant')::numeric;
      END IF;
    END LOOP;
  END IF;

  -- ── RETENUES SALARIALES ──
  v_plafond := COALESCE((v_par->>'cnps_plafond_mensuel')::numeric, 3375000);
  v_cnps_sal := ROUND(LEAST(v_base_cnps, v_plafond) * COALESCE((v_par->>'cnps_retraite_salariale')::numeric,0) / 100);
  v_cmu_sal := COALESCE((v_par->>'cmu_part_salariale')::numeric, 0);

  v_parts := GREATEST(COALESCE(p.parts_fiscales, 1), 1);
  v_quotient := (v_imposable - v_cnps_sal) / v_parts;
  FOR t IN SELECT tranche_min, tranche_max, taux FROM rh_bareme_irpp
            WHERE ecole_id = _ecole_id ORDER BY ordre LOOP
    IF v_quotient > t.tranche_min - 1 THEN
      v_reste := LEAST(v_quotient, COALESCE(t.tranche_max, v_quotient)) - (t.tranche_min - 1);
      IF v_reste > 0 THEN v_irpp := v_irpp + v_reste * t.taux / 100; END IF;
    END IF;
  END LOOP;
  v_irpp := ROUND(GREATEST(v_irpp, 0) * v_parts);

  v_lignes := v_lignes
    || jsonb_build_object('code','cnps_salarie','libelle','CNPS salarié','type','retenue',
         'base',LEAST(v_base_cnps, v_plafond),'taux',(v_par->>'cnps_retraite_salariale')::numeric,'montant',v_cnps_sal,'ordre',1)
    || jsonb_build_object('code','cmu_salarie','libelle','CMU salarié','type','retenue',
         'base',NULL,'taux',NULL,'montant',v_cmu_sal,'ordre',2)
    || jsonb_build_object('code','its_irpp','libelle','ITS / IRPP','type','retenue',
         'base',v_imposable - v_cnps_sal,'taux',NULL,'montant',v_irpp,'ordre',3);
  v_retenues := v_cnps_sal + v_cmu_sal + v_irpp;

  -- ── CHARGES PATRONALES ──
  FOR t IN SELECT * FROM (VALUES
      ('cnps_employeur','CNPS employeur','cnps_retraite_patronale',1),
      ('prestations_familiales','Prestations familiales','cnps_prestations_familiales',2),
      ('assurance_maternite','Assurance maternité','cnps_maternite',3),
      ('accident_travail','Accident du travail','cnps_accident_travail',4),
      ('contribution_employeur','Contribution employeur / IS locaux','cp_contribution_employeur',6),
      ('taxe_apprentissage','Taxe d''apprentissage','cp_taxe_apprentissage',7),
      ('fdfp','FDFP / Formation professionnelle','cp_fdfp',8)
    ) AS x(code, libelle, cle, ordre)
  LOOP
    DECLARE v_taux numeric; v_mt numeric;
    BEGIN
      v_taux := COALESCE((v_par->>t.cle)::numeric, 0);
      v_mt := ROUND(LEAST(v_base_cnps, v_plafond) * v_taux / 100);
      IF v_mt > 0 THEN
        v_lignes := v_lignes || jsonb_build_object('code',t.code,'libelle',t.libelle,
          'type','charge_patronale','base',LEAST(v_base_cnps, v_plafond),'taux',v_taux,'montant',v_mt,'ordre',t.ordre);
        v_patronales := v_patronales + v_mt;
      END IF;
    END;
  END LOOP;

  IF COALESCE((v_par->>'cmu_part_patronale')::numeric,0) > 0 THEN
    v_lignes := v_lignes || jsonb_build_object('code','cmu_employeur','libelle','CMU employeur',
      'type','charge_patronale','base',NULL,'taux',NULL,
      'montant',(v_par->>'cmu_part_patronale')::numeric,'ordre',5);
    v_patronales := v_patronales + (v_par->>'cmu_part_patronale')::numeric;
  END IF;

  v_net := v_gains - v_retenues;

  RETURN jsonb_build_object(
    'ok', true,
    'personnel_id', p.id, 'matricule', p.matricule,
    'nom', p.nom, 'prenom', p.prenom, 'poste', COALESCE(p.poste, p.specialite),
    'mois', _mois, 'annee', _annee,
    'date_embauche', v_embauche,
    'anciennete_annees', v_anc_annees, 'anciennete_taux', v_anc_taux,
    'prime_transport', v_transport,
    'total_gains', v_gains, 'brut_imposable', v_imposable, 'base_cnps', v_base_cnps,
    'total_retenues', v_retenues, 'total_charges_patronales', v_patronales,
    'net_a_payer', v_net, 'cout_employeur', v_gains + v_patronales,
    'lignes', v_lignes, 'alertes', v_alertes);
END;
$function$;

-- 3. Génération d'un bulletin à partir du net à payer souhaité
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
SET search_path TO 'public'
AS $function$
DECLARE
  calc jsonb; l jsonb; v_id uuid;
  lo numeric := 0; hi numeric; mid numeric; v_net numeric;
  i int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::public.app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::public.app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::public.app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _mois NOT BETWEEN 1 AND 12 OR _annee NOT BETWEEN 2000 AND 2200 THEN
    RAISE EXCEPTION 'periode_invalide';
  END IF;
  IF COALESCE(_net_cible, 0) <= 0 THEN RAISE EXCEPTION 'net_invalide'; END IF;
  IF NOT EXISTS (SELECT 1 FROM enseignants WHERE id = _personnel_id AND ecole_id = _ecole_id) THEN
    RAISE EXCEPTION 'personnel_introuvable';
  END IF;
  IF EXISTS (SELECT 1 FROM bulletins_paie b
              WHERE b.ecole_id = _ecole_id AND b.enseignant_id = _personnel_id
                AND b.mois = _mois AND b.annee = _annee) THEN
    RAISE EXCEPTION 'bulletin_existe_deja';
  END IF;

  -- Recherche dichotomique de la base qui produit exactement le net demandé
  hi := _net_cible * 3 + 1000000;
  FOR i IN 1..60 LOOP
    mid := (lo + hi) / 2;
    calc := rh_calculer_bulletin(_ecole_id, _personnel_id, _mois, _annee, mid);
    IF (calc->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'calcul_impossible';
    END IF;
    v_net := (calc->>'net_a_payer')::numeric;
    IF abs(v_net - _net_cible) < 1 THEN EXIT; END IF;
    IF v_net < _net_cible THEN lo := mid; ELSE hi := mid; END IF;
  END LOOP;

  calc := rh_calculer_bulletin(_ecole_id, _personnel_id, _mois, _annee, ROUND(mid));
  IF (calc->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'calcul_impossible'; END IF;

  INSERT INTO bulletins_paie (ecole_id, enseignant_id, mois, annee, statut,
    salaire_brut, retenues, net_a_payer, total_gains, brut_imposable, base_cnps,
    total_charges_patronales, cout_employeur, anciennete_annees, notes)
  VALUES (_ecole_id, _personnel_id, _mois, _annee, 'brouillon',
    (calc->>'total_gains')::numeric, (calc->>'total_retenues')::numeric,
    (calc->>'net_a_payer')::numeric, (calc->>'total_gains')::numeric,
    (calc->>'brut_imposable')::numeric, (calc->>'base_cnps')::numeric,
    (calc->>'total_charges_patronales')::numeric, (calc->>'cout_employeur')::numeric,
    (calc->>'anciennete_annees')::int,
    'Bulletin calculé à rebours depuis un net à payer cible de ' || ROUND(_net_cible)::text || ' FCFA')
  RETURNING id INTO v_id;

  FOR l IN SELECT * FROM jsonb_array_elements(calc->'lignes') LOOP
    INSERT INTO rh_bulletin_lignes (ecole_id, bulletin_id, rubrique_code, libelle, type, base, taux, montant, ordre)
    VALUES (_ecole_id, v_id, l->>'code', l->>'libelle', l->>'type',
            COALESCE((l->>'base')::numeric,0), (l->>'taux')::numeric,
            (l->>'montant')::numeric, COALESCE((l->>'ordre')::int,0));
  END LOOP;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (_ecole_id, auth.uid(), 'paie.bulletin_depuis_net', _mois || '/' || _annee, 'info',
          jsonb_build_object('bulletin_id', v_id, 'net_cible', _net_cible,
                             'net_obtenu', (calc->>'net_a_payer')::numeric));

  RETURN jsonb_build_object('ok', true, 'bulletin_id', v_id,
    'net_a_payer', (calc->>'net_a_payer')::numeric,
    'total_gains', (calc->>'total_gains')::numeric);
END;
$function$;

REVOKE ALL ON FUNCTION public.rh_bulletin_depuis_net(uuid, uuid, integer, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_bulletin_depuis_net(uuid, uuid, integer, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calculer_bulletin(uuid, uuid, integer, integer, numeric) TO authenticated, service_role;