
-- 1) Supprimer le déclencheur global redondant (agit sur sp_services.stock_actuel, sans garde-fou)
DROP TRIGGER IF EXISTS trg_sp_ventes_stock ON public.sp_ventes_tenues;
DROP FUNCTION IF EXISTS public.sp_ventes_stock_trigger();

-- 2) Renforcer le trigger par classe/genre : bloquer les ruptures hors réservation
CREATE OR REPLACE FUNCTION public.sp_apply_stock_tenue_classe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  was_out boolean := false;
  is_out  boolean := false;
  v_stock integer := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL
       AND NEW.statut IN ('paye','remis') THEN
      SELECT COALESCE(stock_actuel,0) INTO v_stock
        FROM public.sp_stock_tenues
        WHERE ecole_id = NEW.ecole_id AND classe_id = NEW.classe_id AND genre = NEW.genre;
      IF v_stock < COALESCE(NEW.quantite,0) THEN
        RAISE EXCEPTION 'Stock insuffisant (% disponible, % demandé). Utilisez le statut "reservation".', v_stock, NEW.quantite
          USING ERRCODE = 'check_violation';
      END IF;
      UPDATE public.sp_stock_tenues
        SET stock_actuel = GREATEST(0, stock_actuel - COALESCE(NEW.quantite,0))
        WHERE ecole_id = NEW.ecole_id AND classe_id = NEW.classe_id AND genre = NEW.genre;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    was_out := (OLD.classe_id IS NOT NULL AND OLD.genre IS NOT NULL AND OLD.statut IN ('paye','remis'));
    is_out  := (NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL AND NEW.statut IN ('paye','remis'));

    IF was_out THEN
      UPDATE public.sp_stock_tenues
        SET stock_actuel = stock_actuel + COALESCE(OLD.quantite,0)
        WHERE ecole_id = OLD.ecole_id AND classe_id = OLD.classe_id AND genre = OLD.genre;
    END IF;

    IF is_out THEN
      SELECT COALESCE(stock_actuel,0) INTO v_stock
        FROM public.sp_stock_tenues
        WHERE ecole_id = NEW.ecole_id AND classe_id = NEW.classe_id AND genre = NEW.genre;
      IF v_stock < COALESCE(NEW.quantite,0) THEN
        RAISE EXCEPTION 'Stock insuffisant (% disponible, % demandé). Réapprovisionnez ou repassez en "reservation".', v_stock, NEW.quantite
          USING ERRCODE = 'check_violation';
      END IF;
      UPDATE public.sp_stock_tenues
        SET stock_actuel = GREATEST(0, stock_actuel - COALESCE(NEW.quantite,0))
        WHERE ecole_id = NEW.ecole_id AND classe_id = NEW.classe_id AND genre = NEW.genre;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Journal d'inventaire
CREATE TABLE IF NOT EXISTS public.sp_stock_tenues_mouvements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  genre TEXT NOT NULL CHECK (genre IN ('F','G')),
  type TEXT NOT NULL CHECK (type IN ('entree','sortie','ajustement','annulation','retrait')),
  quantite INTEGER NOT NULL,
  stock_avant INTEGER,
  stock_apres INTEGER,
  motif TEXT,
  vente_id UUID REFERENCES public.sp_ventes_tenues(id) ON DELETE SET NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_stmv_ecole_date ON public.sp_stock_tenues_mouvements(ecole_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_stmv_classe ON public.sp_stock_tenues_mouvements(classe_id, genre);

GRANT SELECT, INSERT ON public.sp_stock_tenues_mouvements TO authenticated;
GRANT ALL ON public.sp_stock_tenues_mouvements TO service_role;

ALTER TABLE public.sp_stock_tenues_mouvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read stock mouvements same ecole"
  ON public.sp_stock_tenues_mouvements FOR SELECT
  TO authenticated
  USING (ecole_id IN (SELECT ecole_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Insert stock mouvements staff"
  ON public.sp_stock_tenues_mouvements FOR INSERT
  TO authenticated
  WITH CHECK (
    ecole_id IN (SELECT ecole_id FROM public.profiles WHERE id = auth.uid())
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'directeur'::app_role)
      OR private.has_role(auth.uid(), 'comptable'::app_role)
      OR private.has_role(auth.uid(), 'secretaire'::app_role)
    )
  );

-- 4) Trigger d'alimentation sur sp_stock_tenues (ajustements manuels / réappro)
CREATE OR REPLACE FUNCTION public.sp_log_stock_tenue_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delta INTEGER;
  v_type TEXT;
BEGIN
  v_delta := COALESCE(NEW.stock_actuel,0) - COALESCE(OLD.stock_actuel,0);
  IF v_delta = 0 THEN RETURN NEW; END IF;
  -- Les décréments faits par sp_apply_stock_tenue_classe sont déjà tracés par le trigger sur sp_ventes_tenues.
  -- Ici on trace uniquement les ajustements/réappro (non liés à une vente en cours).
  IF v_delta > 0 THEN v_type := 'entree'; ELSE v_type := 'ajustement'; END IF;
  INSERT INTO public.sp_stock_tenues_mouvements
    (ecole_id, classe_id, genre, type, quantite, stock_avant, stock_apres, motif, user_id)
  VALUES
    (NEW.ecole_id, NEW.classe_id, NEW.genre, v_type, ABS(v_delta),
     COALESCE(OLD.stock_actuel,0), COALESCE(NEW.stock_actuel,0),
     'Ajustement manuel', auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_log_stock_tenue_change ON public.sp_stock_tenues;
CREATE TRIGGER trg_sp_log_stock_tenue_change
AFTER UPDATE OF stock_actuel ON public.sp_stock_tenues
FOR EACH ROW EXECUTE FUNCTION public.sp_log_stock_tenue_change();

-- 5) Trigger d'alimentation sur sp_ventes_tenues (sorties / retraits / annulations)
CREATE OR REPLACE FUNCTION public.sp_log_vente_tenue_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  was_out boolean := false;
  is_out  boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL AND NEW.statut IN ('paye','remis') THEN
      INSERT INTO public.sp_stock_tenues_mouvements
        (ecole_id, classe_id, genre, type, quantite, motif, vente_id, user_id)
      VALUES
        (NEW.ecole_id, NEW.classe_id, NEW.genre,
         CASE WHEN NEW.statut = 'remis' THEN 'retrait' ELSE 'sortie' END,
         COALESCE(NEW.quantite,0),
         'Vente ' || COALESCE(NEW.numero,''), NEW.id, auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    was_out := (OLD.statut IN ('paye','remis'));
    is_out  := (NEW.statut IN ('paye','remis'));
    IF NOT was_out AND is_out THEN
      INSERT INTO public.sp_stock_tenues_mouvements
        (ecole_id, classe_id, genre, type, quantite, motif, vente_id, user_id)
      VALUES
        (NEW.ecole_id, NEW.classe_id, NEW.genre,
         CASE WHEN NEW.statut = 'remis' THEN 'retrait' ELSE 'sortie' END,
         COALESCE(NEW.quantite,0),
         'Vente ' || COALESCE(NEW.numero,''), NEW.id, auth.uid());
    ELSIF was_out AND NOT is_out THEN
      INSERT INTO public.sp_stock_tenues_mouvements
        (ecole_id, classe_id, genre, type, quantite, motif, vente_id, user_id)
      VALUES
        (OLD.ecole_id, OLD.classe_id, OLD.genre, 'annulation',
         COALESCE(OLD.quantite,0),
         'Annulation vente ' || COALESCE(OLD.numero,''), OLD.id, auth.uid());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_log_vente_tenue_stock ON public.sp_ventes_tenues;
CREATE TRIGGER trg_sp_log_vente_tenue_stock
AFTER INSERT OR UPDATE ON public.sp_ventes_tenues
FOR EACH ROW EXECUTE FUNCTION public.sp_log_vente_tenue_stock();
