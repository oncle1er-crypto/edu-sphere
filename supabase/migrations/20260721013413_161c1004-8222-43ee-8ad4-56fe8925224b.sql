
-- Ajouter le paramètre tarif par élève sur ecoles
ALTER TABLE public.ecoles
  ADD COLUMN IF NOT EXISTS tarif_honoraire_vacances_par_eleve integer NOT NULL DEFAULT 500;

-- Fonction de recalcul des honoraires prévus pour tous les enseignants d'une classe
CREATE OR REPLACE FUNCTION public.recalculer_honoraires_vacances(p_classe_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ecole_id uuid;
  v_tarif integer;
  v_count integer;
BEGIN
  IF p_classe_id IS NULL THEN RETURN; END IF;

  SELECT ecole_id INTO v_ecole_id FROM public.vacances_classes WHERE id = p_classe_id;
  IF v_ecole_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(tarif_honoraire_vacances_par_eleve, 500) INTO v_tarif
  FROM public.ecoles WHERE id = v_ecole_id;

  SELECT COUNT(*) INTO v_count
  FROM public.vacances_eleves
  WHERE classe_id = p_classe_id;

  UPDATE public.vacances_enseignants
     SET honoraire_prevu = COALESCE(v_tarif, 500) * v_count
   WHERE classe_id = p_classe_id;
END;
$$;

-- Trigger sur vacances_eleves
CREATE OR REPLACE FUNCTION public.trg_vac_eleves_recalc_honoraires()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculer_honoraires_vacances(NEW.classe_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.classe_id IS DISTINCT FROM OLD.classe_id THEN
      PERFORM public.recalculer_honoraires_vacances(OLD.classe_id);
      PERFORM public.recalculer_honoraires_vacances(NEW.classe_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculer_honoraires_vacances(OLD.classe_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_vac_eleves_honoraires ON public.vacances_eleves;
CREATE TRIGGER trg_vac_eleves_honoraires
AFTER INSERT OR UPDATE OF classe_id OR DELETE ON public.vacances_eleves
FOR EACH ROW EXECUTE FUNCTION public.trg_vac_eleves_recalc_honoraires();

-- Trigger sur vacances_enseignants (nouvelle affectation)
CREATE OR REPLACE FUNCTION public.trg_vac_enseignants_recalc_honoraires()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ecole_id uuid;
  v_tarif integer;
  v_count integer;
BEGIN
  IF NEW.classe_id IS NULL THEN
    NEW.honoraire_prevu := 0;
    RETURN NEW;
  END IF;

  SELECT ecole_id INTO v_ecole_id FROM public.vacances_classes WHERE id = NEW.classe_id;
  SELECT COALESCE(tarif_honoraire_vacances_par_eleve, 500) INTO v_tarif FROM public.ecoles WHERE id = v_ecole_id;
  SELECT COUNT(*) INTO v_count FROM public.vacances_eleves WHERE classe_id = NEW.classe_id;

  NEW.honoraire_prevu := COALESCE(v_tarif, 500) * v_count;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vac_enseignants_honoraires ON public.vacances_enseignants;
CREATE TRIGGER trg_vac_enseignants_honoraires
BEFORE INSERT OR UPDATE OF classe_id ON public.vacances_enseignants
FOR EACH ROW EXECUTE FUNCTION public.trg_vac_enseignants_recalc_honoraires();

-- Recalcul initial pour toutes les classes existantes
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.vacances_classes LOOP
    PERFORM public.recalculer_honoraires_vacances(r.id);
  END LOOP;
END $$;
