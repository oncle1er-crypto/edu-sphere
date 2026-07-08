
CREATE OR REPLACE FUNCTION public.recalc_vacances_eleve_statut(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_attendu numeric := 0;
  v_statut text := 'non_paye';
BEGIN
  SELECT COALESCE(SUM(montant_paye), 0) INTO v_total
    FROM public.vacances_paiements WHERE eleve_id = _eleve_id;

  SELECT COALESCE(c.montant, 0) INTO v_attendu
    FROM public.vacances_eleves e
    LEFT JOIN public.vacances_classes c ON c.id = e.classe_id
    WHERE e.id = _eleve_id;

  IF v_total <= 0 THEN v_statut := 'non_paye';
  ELSIF v_attendu > 0 AND v_total >= v_attendu THEN v_statut := 'paye';
  ELSE v_statut := 'partiel';
  END IF;

  UPDATE public.vacances_eleves SET statut_paiement = v_statut WHERE id = _eleve_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_vacances_paiement_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_vacances_eleve_statut(OLD.eleve_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_vacances_eleve_statut(NEW.eleve_id);
    IF TG_OP = 'UPDATE' AND OLD.eleve_id IS DISTINCT FROM NEW.eleve_id THEN
      PERFORM public.recalc_vacances_eleve_statut(OLD.eleve_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_vacances_paiement_recalc ON public.vacances_paiements;
CREATE TRIGGER trg_vacances_paiement_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.vacances_paiements
FOR EACH ROW EXECUTE FUNCTION public.trg_vacances_paiement_recalc();

CREATE INDEX IF NOT EXISTS idx_vacances_paiements_eleve ON public.vacances_paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_vacances_eleves_classe ON public.vacances_eleves(classe_id);
CREATE INDEX IF NOT EXISTS idx_vacances_honoraires_enseignant ON public.vacances_honoraires(enseignant_id);
