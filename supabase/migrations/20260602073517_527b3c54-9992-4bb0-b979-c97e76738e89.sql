
-- 1. Table grille_tarifs_niveaux
CREATE TABLE public.grille_tarifs_niveaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id uuid NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  niveau_code text NOT NULL,
  variant text,
  libelle text NOT NULL,
  tranches jsonb NOT NULL DEFAULT '[]'::jsonb,
  montant_total numeric(12,0) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grille_variant_check CHECK (variant IS NULL OR variant IN ('ancien','nouveau')),
  CONSTRAINT grille_niveau_check CHECK (niveau_code IN ('MAT1','MAT2','GS','CP','CE','CM','COL_65','COL_4','COL_3'))
);

CREATE UNIQUE INDEX grille_tarifs_unique
  ON public.grille_tarifs_niveaux (ecole_id, annee_id, niveau_code, COALESCE(variant,''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grille_tarifs_niveaux TO authenticated;
GRANT ALL ON public.grille_tarifs_niveaux TO service_role;

ALTER TABLE public.grille_tarifs_niveaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.grille_tarifs_niveaux
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.grille_tarifs_niveaux
  FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.grille_tarifs_niveaux
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-calcul montant_total à partir de tranches JSON
CREATE OR REPLACE FUNCTION public.tg_grille_calc_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT COALESCE(SUM((t->>'montant')::numeric), 0)
    INTO NEW.montant_total
    FROM jsonb_array_elements(NEW.tranches) t;
  RETURN NEW;
END;
$$;

CREATE TRIGGER grille_calc_total BEFORE INSERT OR UPDATE ON public.grille_tarifs_niveaux
  FOR EACH ROW EXECUTE FUNCTION public.tg_grille_calc_total();

-- 2. Champ est_nouveau sur eleves
ALTER TABLE public.eleves ADD COLUMN IF NOT EXISTS est_nouveau boolean NOT NULL DEFAULT false;

-- 3. Résolution niveau_code depuis nom de classe
CREATE OR REPLACE FUNCTION public.resoudre_niveau_code(_classe_nom text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text := upper(COALESCE(_classe_nom,''));
BEGIN
  IF n ~ 'PS|MATERNELLE\s*1|PETITE\s*SEC' THEN RETURN 'MAT1'; END IF;
  IF n ~ 'MS|MATERNELLE\s*2|MOYENNE\s*SEC' THEN RETURN 'MAT2'; END IF;
  IF n ~ 'GS|GRANDE\s*SEC' THEN RETURN 'GS'; END IF;
  IF n ~ 'CP' THEN RETURN 'CP'; END IF;
  IF n ~ 'CE' THEN RETURN 'CE'; END IF;
  IF n ~ 'CM' THEN RETURN 'CM'; END IF;
  IF n ~ '6\D|6E|5\D|5E|SIXIEME|CINQUIEME' THEN RETURN 'COL_65'; END IF;
  IF n ~ '4\D|4E|QUATRIEME' THEN RETURN 'COL_4'; END IF;
  IF n ~ '3\D|3E|TROISIEME' THEN RETURN 'COL_3'; END IF;
  RETURN NULL;
END;
$$;

-- 4. Réécriture generer_tranches_eleve
CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Cherche grille
  IF v_niveau IS NOT NULL THEN
    SELECT * INTO v_grille FROM grille_tarifs_niveaux
     WHERE ecole_id = v_ecole AND annee_id = v_annee AND niveau_code = v_niveau
       AND (variant IS NOT DISTINCT FROM v_variant)
     LIMIT 1;
    -- fallback sans variant
    IF NOT FOUND AND v_variant IS NOT NULL THEN
      SELECT * INTO v_grille FROM grille_tarifs_niveaux
       WHERE ecole_id = v_ecole AND annee_id = v_annee AND niveau_code = v_niveau AND variant IS NULL
       LIMIT 1;
    END IF;
  END IF;

  IF FOUND AND jsonb_array_length(v_grille.tranches) > 0 THEN
    -- Crée un frais_scolarite synthétique pour rattacher les tranches (FK existante)
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

  -- Fallback ancien comportement (par cycle)
  IF v_cycle IS NULL THEN RETURN; END IF;
  SELECT * INTO v_frais FROM frais_scolarite
   WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

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
$$;

-- 5. Régénération pour les pré-inscrits sans paiement
CREATE OR REPLACE FUNCTION public.regenerer_tranches_pre_inscrits(_ecole_id uuid, _annee_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_eleve RECORD; v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'Acces refuse : admin/comptable requis';
  END IF;

  FOR v_eleve IN
    SELECT e.id FROM eleves e
    WHERE e.ecole_id = _ecole_id AND e.annee_id = _annee_id
      AND e.statut = 'pre_inscrit'
      AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.eleve_id = e.id)
  LOOP
    DELETE FROM tranches WHERE eleve_id = v_eleve.id
      AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.tranche_id = tranches.id);
    PERFORM generer_tranches_eleve(v_eleve.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6. Duplication grille année source → cible
CREATE OR REPLACE FUNCTION public.dupliquer_grille_annee(_ecole_id uuid, _annee_source uuid, _annee_cible uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  INSERT INTO grille_tarifs_niveaux (ecole_id, annee_id, niveau_code, variant, libelle, tranches)
  SELECT ecole_id, _annee_cible, niveau_code, variant, libelle, tranches
    FROM grille_tarifs_niveaux
   WHERE ecole_id = _ecole_id AND annee_id = _annee_source
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
