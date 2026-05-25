
-- Function: generate tranches for a single eleve based on his classe -> cycle -> frais_scolarite
CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ecole uuid;
  v_annee uuid;
  v_cycle uuid;
  v_frais RECORD;
  v_montant_tranche numeric;
  v_labels text[] := ARRAY['1ère tranche','2ème tranche','3ème tranche'];
  v_dates date[];
  i int;
BEGIN
  SELECT e.ecole_id, e.annee_id, c.cycle_id
    INTO v_ecole, v_annee, v_cycle
  FROM eleves e
  LEFT JOIN classes c ON c.id = e.classe_id
  WHERE e.id = _eleve_id;

  IF v_ecole IS NULL OR v_annee IS NULL OR v_cycle IS NULL THEN RETURN; END IF;

  SELECT * INTO v_frais
  FROM frais_scolarite
  WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Skip if tranches already exist for this eleve+frais
  IF EXISTS (SELECT 1 FROM tranches WHERE eleve_id = _eleve_id AND frais_id = v_frais.id) THEN
    RETURN;
  END IF;

  -- Build 3 due dates: Oct 15, Jan 15, Apr 15 of the academic year
  SELECT ARRAY[
    make_date(EXTRACT(YEAR FROM debut)::int, 10, 15),
    make_date(EXTRACT(YEAR FROM fin)::int, 1, 15),
    make_date(EXTRACT(YEAR FROM fin)::int, 4, 15)
  ] INTO v_dates
  FROM annees_scolaires WHERE id = v_annee;

  v_montant_tranche := ROUND(v_frais.montant_annuel / GREATEST(v_frais.nb_tranches,1));

  FOR i IN 1..LEAST(v_frais.nb_tranches, 3) LOOP
    INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
    VALUES (
      v_ecole, _eleve_id, v_frais.id, i, v_labels[i], v_dates[i],
      CASE WHEN i = v_frais.nb_tranches THEN v_frais.montant_annuel - v_montant_tranche*(i-1) ELSE v_montant_tranche END,
      0,
      CASE WHEN v_dates[i] < CURRENT_DATE THEN 'retard'::tranche_statut ELSE 'due'::tranche_statut END
    );
  END LOOP;
END;
$$;

-- Function: when a new frais_scolarite is created, generate tranches for all eligible eleves
CREATE OR REPLACE FUNCTION public.generer_tranches_pour_frais(_frais_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_frais RECORD;
  v_count int := 0;
  v_eleve RECORD;
BEGIN
  SELECT * INTO v_frais FROM frais_scolarite WHERE id = _frais_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_eleve IN
    SELECT e.id
    FROM eleves e
    JOIN classes c ON c.id = e.classe_id
    WHERE e.ecole_id = v_frais.ecole_id
      AND e.annee_id = v_frais.annee_id
      AND c.cycle_id = v_frais.cycle_id
  LOOP
    PERFORM generer_tranches_eleve(v_eleve.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Trigger on eleves: auto-generate tranches when classe_id is set/changed
CREATE OR REPLACE FUNCTION public.trg_generer_tranches_eleve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.classe_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.classe_id IS DISTINCT FROM NEW.classe_id) THEN
    PERFORM generer_tranches_eleve(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS eleves_generer_tranches ON public.eleves;
CREATE TRIGGER eleves_generer_tranches
AFTER INSERT OR UPDATE OF classe_id ON public.eleves
FOR EACH ROW EXECUTE FUNCTION public.trg_generer_tranches_eleve();

-- Trigger on frais_scolarite: auto-generate tranches for matching eleves
CREATE OR REPLACE FUNCTION public.trg_generer_tranches_frais()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM generer_tranches_pour_frais(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS frais_generer_tranches ON public.frais_scolarite;
CREATE TRIGGER frais_generer_tranches
AFTER INSERT ON public.frais_scolarite
FOR EACH ROW EXECUTE FUNCTION public.trg_generer_tranches_frais();
