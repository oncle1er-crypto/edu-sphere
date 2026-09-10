-- Second moyen de paiement (paiement scindé) sur les tables à une seule ligne par paiement.
ALTER TABLE public.sp_paiements
  ADD COLUMN IF NOT EXISTS mode_paiement_2 sp_mode_paiement,
  ADD COLUMN IF NOT EXISTS montant_2 numeric;

ALTER TABLE public.sp_ventes_tenues
  ADD COLUMN IF NOT EXISTS mode_paiement_2 sp_mode_paiement,
  ADD COLUMN IF NOT EXISTS montant_2 numeric;

ALTER TABLE public.vacances_paiements
  ADD COLUMN IF NOT EXISTS mode_2 text,
  ADD COLUMN IF NOT EXISTS montant_2 numeric;

CREATE OR REPLACE FUNCTION public.check_paiement_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_mode2 text;
  v_mode1 text;
BEGIN
  IF TG_TABLE_NAME = 'vacances_paiements' THEN
    v_mode2 := NEW.mode_2::text;
    v_mode1 := NEW.mode::text;
  ELSE
    v_mode2 := NEW.mode_paiement_2::text;
    v_mode1 := NEW.mode_paiement::text;
  END IF;

  IF v_mode2 IS NULL AND NEW.montant_2 IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_mode2 IS NULL OR NEW.montant_2 IS NULL THEN
    RAISE EXCEPTION 'split_incomplet';
  END IF;

  IF NEW.montant_2 <= 0 THEN
    RAISE EXCEPTION 'split_montant_invalide';
  END IF;

  IF v_mode2 = v_mode1 THEN
    RAISE EXCEPTION 'split_modes_identiques';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_paiements_split ON public.sp_paiements;
CREATE TRIGGER trg_sp_paiements_split
  BEFORE INSERT OR UPDATE ON public.sp_paiements
  FOR EACH ROW EXECUTE FUNCTION public.check_paiement_split();

DROP TRIGGER IF EXISTS trg_sp_ventes_tenues_split ON public.sp_ventes_tenues;
CREATE TRIGGER trg_sp_ventes_tenues_split
  BEFORE INSERT OR UPDATE ON public.sp_ventes_tenues
  FOR EACH ROW EXECUTE FUNCTION public.check_paiement_split();

DROP TRIGGER IF EXISTS trg_vacances_paiements_split ON public.vacances_paiements;
CREATE TRIGGER trg_vacances_paiements_split
  BEFORE INSERT OR UPDATE ON public.vacances_paiements
  FOR EACH ROW EXECUTE FUNCTION public.check_paiement_split();