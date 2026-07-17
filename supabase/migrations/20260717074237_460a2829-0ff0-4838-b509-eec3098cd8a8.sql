
-- ============================================================
-- PHASE A - Migrations : Recalcul grille + Grille services + Bons
-- ============================================================

-- 1) Recalcul scolarité pour toute l'école (préserve les paiements déjà encaissés)
CREATE OR REPLACE FUNCTION public.recalculer_grille_ecole(
  _ecole_id uuid,
  _annee_id uuid,
  _niveau_code text DEFAULT NULL,
  _seulement_pre_inscrits boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eleve RECORD;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin/comptable/directeur requis';
  END IF;

  FOR v_eleve IN
    SELECT e.id
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.ecole_id = _ecole_id
      AND e.annee_id = _annee_id
      AND COALESCE(e.statut::text, '') <> 'sorti'
      AND (_niveau_code IS NULL OR public.resoudre_niveau_code(c.nom) = _niveau_code)
      AND (NOT _seulement_pre_inscrits OR e.statut::text = 'pre_inscrit')
  LOOP
    BEGIN
      PERFORM public.generer_tranches_eleve(v_eleve.id, true);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('eleves_traites', v_count);
END;
$$;

-- ============================================================
-- 2) Grille tarifaire des services (cantine / transport)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grille_tarifs_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id uuid NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('cantine','transport')),
  libelle text NOT NULL,
  periodicite text NOT NULL DEFAULT 'trimestriel' CHECK (periodicite IN ('mensuel','trimestriel')),
  tranches jsonb NOT NULL DEFAULT '[]'::jsonb,
  montant_total numeric NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grille_tarifs_services TO authenticated;
GRANT ALL ON public.grille_tarifs_services TO service_role;

ALTER TABLE public.grille_tarifs_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grille_services_read" ON public.grille_tarifs_services
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "grille_services_write" ON public.grille_tarifs_services
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

CREATE OR REPLACE FUNCTION public.tg_grille_services_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT COALESCE(SUM((t->>'montant')::numeric), 0)
    INTO NEW.montant_total
    FROM jsonb_array_elements(NEW.tranches) t;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_grille_services_total
BEFORE INSERT OR UPDATE ON public.grille_tarifs_services
FOR EACH ROW EXECUTE FUNCTION public.tg_grille_services_total();

-- ============================================================
-- 3) Échéances services (une ligne par tranche/mois pour chaque abonné)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.echeances_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id uuid NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('cantine','transport')),
  grille_id uuid REFERENCES public.grille_tarifs_services(id) ON DELETE SET NULL,
  numero int NOT NULL,
  label text NOT NULL,
  echeance date NOT NULL,
  montant numeric NOT NULL DEFAULT 0,
  paye numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'due' CHECK (statut IN ('due','partielle','payee','retard')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, service_type, annee_id, numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.echeances_services TO authenticated;
GRANT ALL ON public.echeances_services TO service_role;

ALTER TABLE public.echeances_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "echeances_services_read" ON public.echeances_services
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "echeances_services_write" ON public.echeances_services
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- ============================================================
-- 4) Paiements services
-- ============================================================
CREATE TABLE IF NOT EXISTS public.paiements_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  echeance_id uuid NOT NULL REFERENCES public.echeances_services(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('cantine','transport')),
  montant numeric NOT NULL CHECK (montant > 0),
  mode text NOT NULL DEFAULT 'espece',
  reference text,
  motif text,
  bon_reduction_id uuid,
  recu_par uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paiements_services TO authenticated;
GRANT ALL ON public.paiements_services TO service_role;

ALTER TABLE public.paiements_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paiements_services_read" ON public.paiements_services
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "paiements_services_write" ON public.paiements_services
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- ============================================================
-- 5) Bons de réduction
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bons_reduction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  code text NOT NULL,
  libelle text NOT NULL,
  type text NOT NULL CHECK (type IN ('montant','pourcent')),
  valeur numeric NOT NULL CHECK (valeur > 0),
  service_types text[] NOT NULL DEFAULT ARRAY['cantine','transport']::text[],
  date_debut date,
  date_fin date,
  usage_max int,
  usage_count int NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bons_reduction TO authenticated;
GRANT ALL ON public.bons_reduction TO service_role;

ALTER TABLE public.bons_reduction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bons_reduction_read" ON public.bons_reduction
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "bons_reduction_write" ON public.bons_reduction
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

CREATE TABLE IF NOT EXISTS public.bons_reduction_utilisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  bon_id uuid NOT NULL REFERENCES public.bons_reduction(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  echeance_id uuid REFERENCES public.echeances_services(id) ON DELETE SET NULL,
  montant_applique numeric NOT NULL,
  applique_par uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bons_reduction_utilisations TO authenticated;
GRANT ALL ON public.bons_reduction_utilisations TO service_role;

ALTER TABLE public.bons_reduction_utilisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bons_util_read" ON public.bons_reduction_utilisations
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "bons_util_write" ON public.bons_reduction_utilisations
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- ============================================================
-- 6) Fonctions RPC : générer échéances / paiement / bon
-- ============================================================

CREATE OR REPLACE FUNCTION public.generer_echeances_service(
  _eleve_id uuid,
  _service_type text,
  _grille_id uuid
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ecole uuid; v_annee uuid;
  v_grille RECORD;
  v_annee_debut date; v_annee_fin date;
  v_year int; v_mois int; v_jour int;
  v_idx int; v_date date; v_count int := 0;
  t jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  SELECT ecole_id, annee_id INTO v_ecole, v_annee FROM eleves WHERE id = _eleve_id;
  IF v_ecole IS NULL THEN RAISE EXCEPTION 'Élève introuvable'; END IF;

  IF NOT (private.has_ecole_role(auth.uid(), v_ecole, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ecole, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ecole, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO v_grille FROM grille_tarifs_services
    WHERE id = _grille_id AND ecole_id = v_ecole AND annee_id = v_annee AND service_type = _service_type AND actif;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grille introuvable ou inactive'; END IF;

  SELECT debut, fin INTO v_annee_debut, v_annee_fin FROM annees_scolaires WHERE id = v_annee;
  v_year := EXTRACT(YEAR FROM v_annee_debut);

  FOR v_idx IN 0..(COALESCE(jsonb_array_length(v_grille.tranches),0)-1) LOOP
    t := v_grille.tranches -> v_idx;
    v_mois := (t->>'mois')::int;
    v_jour := (t->>'jour')::int;
    v_date := make_date(
      CASE WHEN v_mois >= EXTRACT(MONTH FROM v_annee_debut)::int THEN v_year ELSE v_year + 1 END,
      v_mois, v_jour
    );

    INSERT INTO echeances_services (
      ecole_id, annee_id, eleve_id, service_type, grille_id,
      numero, label, echeance, montant, statut
    ) VALUES (
      v_ecole, v_annee, _eleve_id, _service_type, _grille_id,
      (t->>'numero')::int,
      COALESCE(t->>'label', 'Échéance ' || (t->>'numero')),
      v_date,
      (t->>'montant')::numeric,
      CASE WHEN v_date < CURRENT_DATE THEN 'retard' ELSE 'due' END
    )
    ON CONFLICT (eleve_id, service_type, annee_id, numero) DO UPDATE
      SET grille_id = EXCLUDED.grille_id,
          label = EXCLUDED.label,
          echeance = EXCLUDED.echeance,
          montant = CASE WHEN echeances_services.paye = 0 THEN EXCLUDED.montant ELSE echeances_services.montant END,
          updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.enregistrer_paiement_service(
  _echeance_id uuid,
  _montant numeric,
  _mode text,
  _reference text DEFAULT NULL,
  _motif text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ech RECORD;
  v_paiement_id uuid;
  v_total numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _montant IS NULL OR _montant <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  SELECT * INTO v_ech FROM echeances_services WHERE id = _echeance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Échéance introuvable'; END IF;

  IF NOT (private.has_ecole_role(auth.uid(), v_ech.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ech.ecole_id, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ech.ecole_id, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_ech.paye + _montant > v_ech.montant THEN
    RAISE EXCEPTION 'Le paiement dépasse le reste dû (% / %)', v_ech.paye, v_ech.montant;
  END IF;

  INSERT INTO paiements_services (
    ecole_id, eleve_id, echeance_id, service_type, montant, mode, reference, motif, recu_par
  ) VALUES (
    v_ech.ecole_id, v_ech.eleve_id, _echeance_id, v_ech.service_type,
    _montant, COALESCE(_mode,'espece'), _reference, _motif, auth.uid()
  ) RETURNING id INTO v_paiement_id;

  v_total := v_ech.paye + _montant;
  UPDATE echeances_services SET
    paye = v_total,
    statut = CASE
      WHEN v_total >= montant THEN 'payee'
      WHEN v_total > 0 THEN 'partielle'
      WHEN echeance < CURRENT_DATE THEN 'retard'
      ELSE 'due'
    END,
    updated_at = now()
  WHERE id = _echeance_id;

  RETURN v_paiement_id;
END; $$;

CREATE OR REPLACE FUNCTION public.appliquer_bon_service(
  _bon_id uuid,
  _echeance_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bon RECORD; v_ech RECORD;
  v_montant numeric; v_total numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  SELECT * INTO v_ech FROM echeances_services WHERE id = _echeance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Échéance introuvable'; END IF;

  IF NOT (private.has_ecole_role(auth.uid(), v_ech.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ech.ecole_id, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ech.ecole_id, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO v_bon FROM bons_reduction WHERE id = _bon_id AND ecole_id = v_ech.ecole_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bon introuvable'; END IF;
  IF NOT v_bon.actif THEN RAISE EXCEPTION 'Bon désactivé'; END IF;
  IF v_bon.date_debut IS NOT NULL AND CURRENT_DATE < v_bon.date_debut THEN RAISE EXCEPTION 'Bon pas encore valide'; END IF;
  IF v_bon.date_fin IS NOT NULL AND CURRENT_DATE > v_bon.date_fin THEN RAISE EXCEPTION 'Bon expiré'; END IF;
  IF v_bon.usage_max IS NOT NULL AND v_bon.usage_count >= v_bon.usage_max THEN RAISE EXCEPTION 'Bon épuisé'; END IF;
  IF NOT (v_ech.service_type = ANY(v_bon.service_types)) THEN RAISE EXCEPTION 'Bon non applicable à ce service'; END IF;

  IF v_bon.type = 'pourcent' THEN
    v_montant := ROUND(v_ech.montant * v_bon.valeur / 100);
  ELSE
    v_montant := v_bon.valeur;
  END IF;

  IF v_ech.paye + v_montant > v_ech.montant THEN
    v_montant := v_ech.montant - v_ech.paye;
  END IF;
  IF v_montant <= 0 THEN RAISE EXCEPTION 'Aucun reste dû à réduire'; END IF;

  INSERT INTO bons_reduction_utilisations (ecole_id, bon_id, eleve_id, echeance_id, montant_applique, applique_par)
  VALUES (v_ech.ecole_id, _bon_id, v_ech.eleve_id, _echeance_id, v_montant, auth.uid());

  UPDATE bons_reduction SET usage_count = usage_count + 1, updated_at = now() WHERE id = _bon_id;

  v_total := v_ech.paye + v_montant;
  UPDATE echeances_services SET
    paye = v_total,
    statut = CASE
      WHEN v_total >= montant THEN 'payee'
      WHEN v_total > 0 THEN 'partielle'
      ELSE 'due'
    END,
    updated_at = now()
  WHERE id = _echeance_id;

  RETURN jsonb_build_object('montant_applique', v_montant);
END; $$;
