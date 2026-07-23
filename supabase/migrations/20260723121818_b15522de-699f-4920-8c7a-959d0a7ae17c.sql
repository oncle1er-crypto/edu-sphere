
-- 1) Add enum value
ALTER TYPE public.sp_vente_statut ADD VALUE IF NOT EXISTS 'reservation';

-- 2) Fix per-classe stock trigger
CREATE OR REPLACE FUNCTION public.sp_apply_stock_tenue_classe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  was_out boolean := false;  -- OLD counted stock out
  is_out  boolean := false;  -- NEW counts stock out
  delta_old integer := 0;
  delta_new integer := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL
       AND NEW.statut IN ('paye','remis') THEN
      UPDATE public.sp_stock_tenues
        SET stock_actuel = GREATEST(0, stock_actuel - COALESCE(NEW.quantite,0))
        WHERE ecole_id = NEW.ecole_id
          AND classe_id = NEW.classe_id
          AND genre = NEW.genre;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    was_out := (OLD.classe_id IS NOT NULL AND OLD.genre IS NOT NULL AND OLD.statut IN ('paye','remis'));
    is_out  := (NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL AND NEW.statut IN ('paye','remis'));

    -- restore OLD outflow
    IF was_out THEN
      UPDATE public.sp_stock_tenues
        SET stock_actuel = stock_actuel + COALESCE(OLD.quantite,0)
        WHERE ecole_id = OLD.ecole_id
          AND classe_id = OLD.classe_id
          AND genre = OLD.genre;
    END IF;

    -- apply NEW outflow
    IF is_out THEN
      UPDATE public.sp_stock_tenues
        SET stock_actuel = GREATEST(0, stock_actuel - COALESCE(NEW.quantite,0))
        WHERE ecole_id = NEW.ecole_id
          AND classe_id = NEW.classe_id
          AND genre = NEW.genre;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Fix global service stock trigger similarly
CREATE OR REPLACE FUNCTION public.sp_ventes_stock_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service_id UUID;
  v_gere BOOLEAN;
  was_out boolean := false;
  is_out  boolean := false;
BEGIN
  SELECT id, gere_stock INTO v_service_id, v_gere
  FROM public.sp_services
  WHERE ecole_id = COALESCE(NEW.ecole_id, OLD.ecole_id)
    AND (slug = 'tenue' OR gere_stock = true)
  ORDER BY (slug = 'tenue') DESC
  LIMIT 1;

  IF v_service_id IS NULL OR v_gere IS NOT TRUE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.statut IN ('paye','remis') THEN
      UPDATE public.sp_services
        SET stock_actuel = COALESCE(stock_actuel,0) - NEW.quantite
        WHERE id = v_service_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    was_out := OLD.statut IN ('paye','remis');
    is_out  := NEW.statut IN ('paye','remis');
    IF was_out AND NOT is_out THEN
      UPDATE public.sp_services
        SET stock_actuel = COALESCE(stock_actuel,0) + OLD.quantite
        WHERE id = v_service_id;
    ELSIF NOT was_out AND is_out THEN
      UPDATE public.sp_services
        SET stock_actuel = COALESCE(stock_actuel,0) - NEW.quantite
        WHERE id = v_service_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
