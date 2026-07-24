
ALTER TABLE public.sp_candidats
  ADD COLUMN IF NOT EXISTS note_francais numeric(4,2),
  ADD COLUMN IF NOT EXISTS note_maths numeric(4,2),
  ADD COLUMN IF NOT EXISTS note_anglais numeric(4,2),
  ADD COLUMN IF NOT EXISTS moyenne_test numeric(4,2);

ALTER TABLE public.sp_candidats
  DROP CONSTRAINT IF EXISTS sp_candidats_notes_range_chk;
ALTER TABLE public.sp_candidats
  ADD CONSTRAINT sp_candidats_notes_range_chk CHECK (
    (note_francais IS NULL OR (note_francais >= 0 AND note_francais <= 20))
    AND (note_maths IS NULL OR (note_maths >= 0 AND note_maths <= 20))
    AND (note_anglais IS NULL OR (note_anglais >= 0 AND note_anglais <= 20))
  );

CREATE OR REPLACE FUNCTION public.sp_candidats_calc_moyenne()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classe_nom text;
  v_is_6_5 boolean := false;
  v_fr numeric := NEW.note_francais;
  v_ma numeric := NEW.note_maths;
  v_an numeric := NEW.note_anglais;
  v_moy numeric;
BEGIN
  -- Determine class name
  v_classe_nom := COALESCE(NEW.classe_demandee, '');
  IF NEW.classe_demandee_id IS NOT NULL THEN
    SELECT nom INTO v_classe_nom FROM public.classes WHERE id = NEW.classe_demandee_id;
    v_classe_nom := COALESCE(v_classe_nom, NEW.classe_demandee, '');
  END IF;

  v_is_6_5 := lower(v_classe_nom) ~ '^\s*(6|5)\s*[eèé]?me?\b';

  IF v_is_6_5 THEN
    IF v_fr IS NOT NULL AND v_ma IS NOT NULL THEN
      v_moy := round((v_fr + v_ma) / 2.0, 2);
    ELSE
      v_moy := NULL;
    END IF;
  ELSE
    IF v_fr IS NOT NULL AND v_ma IS NOT NULL AND v_an IS NOT NULL THEN
      v_moy := round((v_fr + v_ma + v_an) / 3.0, 2);
    ELSE
      v_moy := NULL;
    END IF;
  END IF;

  NEW.moyenne_test := v_moy;

  -- Auto-update statut when moyenne is computed, unless statut = absent (manual)
  IF v_moy IS NOT NULL AND NEW.statut <> 'absent' THEN
    NEW.statut := CASE WHEN v_moy >= 10 THEN 'admis'::sp_candidat_statut ELSE 'refuse'::sp_candidat_statut END;
  ELSIF v_moy IS NULL AND NEW.statut IN ('admis'::sp_candidat_statut, 'refuse'::sp_candidat_statut) THEN
    -- If notes removed and previously admis/refuse, revert to present
    NEW.statut := 'present'::sp_candidat_statut;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_candidats_calc_moyenne ON public.sp_candidats;
CREATE TRIGGER trg_sp_candidats_calc_moyenne
  BEFORE INSERT OR UPDATE OF note_francais, note_maths, note_anglais, classe_demandee, classe_demandee_id
  ON public.sp_candidats
  FOR EACH ROW EXECUTE FUNCTION public.sp_candidats_calc_moyenne();
