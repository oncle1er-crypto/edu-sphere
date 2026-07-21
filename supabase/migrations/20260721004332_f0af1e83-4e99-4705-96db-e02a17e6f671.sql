
-- 1. Table stock tenues par classe/genre
CREATE TABLE IF NOT EXISTS public.sp_stock_tenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  classe_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  genre text NOT NULL CHECK (genre IN ('F','G')),
  stock_actuel integer NOT NULL DEFAULT 0,
  seuil_alerte integer NOT NULL DEFAULT 5,
  prix_unitaire numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, classe_id, genre)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sp_stock_tenues TO authenticated;
GRANT ALL ON public.sp_stock_tenues TO service_role;

ALTER TABLE public.sp_stock_tenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read stock tenues same ecole"
  ON public.sp_stock_tenues FOR SELECT TO authenticated
  USING (ecole_id IN (SELECT ecole_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Manage stock tenues staff"
  ON public.sp_stock_tenues FOR ALL TO authenticated
  USING (
    ecole_id IN (SELECT ecole_id FROM public.profiles WHERE id = auth.uid())
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'directeur'::app_role)
      OR private.has_role(auth.uid(), 'comptable'::app_role)
      OR private.has_role(auth.uid(), 'secretaire'::app_role)
    )
  )
  WITH CHECK (
    ecole_id IN (SELECT ecole_id FROM public.profiles WHERE id = auth.uid())
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'directeur'::app_role)
      OR private.has_role(auth.uid(), 'comptable'::app_role)
      OR private.has_role(auth.uid(), 'secretaire'::app_role)
    )
  );

CREATE TRIGGER trg_sp_stock_tenues_updated
  BEFORE UPDATE ON public.sp_stock_tenues
  FOR EACH ROW EXECUTE FUNCTION public.sp_touch_updated_at();

-- 2. Colonnes classe/genre sur les ventes
ALTER TABLE public.sp_ventes_tenues
  ADD COLUMN IF NOT EXISTS classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS genre text CHECK (genre IN ('F','G'));

-- 3. Trigger de décrément/incrément du stock par classe/genre
CREATE OR REPLACE FUNCTION public.sp_apply_stock_tenue_classe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL
       AND NEW.statut IN ('paye','remis') THEN
      delta := -COALESCE(NEW.quantite, 0);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- annulation
    IF OLD.statut <> 'annule' AND NEW.statut = 'annule'
       AND OLD.classe_id IS NOT NULL AND OLD.genre IS NOT NULL THEN
      delta := COALESCE(OLD.quantite, 0);
      -- appliquer sur l'ancienne classe/genre
      UPDATE public.sp_stock_tenues
        SET stock_actuel = GREATEST(0, stock_actuel + delta)
        WHERE ecole_id = OLD.ecole_id
          AND classe_id = OLD.classe_id
          AND genre = OLD.genre;
      RETURN NEW;
    END IF;
  END IF;

  IF delta <> 0 AND NEW.classe_id IS NOT NULL AND NEW.genre IS NOT NULL THEN
    UPDATE public.sp_stock_tenues
      SET stock_actuel = GREATEST(0, stock_actuel + delta)
      WHERE ecole_id = NEW.ecole_id
        AND classe_id = NEW.classe_id
        AND genre = NEW.genre;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_apply_stock_tenue_classe ON public.sp_ventes_tenues;
CREATE TRIGGER trg_sp_apply_stock_tenue_classe
  AFTER INSERT OR UPDATE ON public.sp_ventes_tenues
  FOR EACH ROW EXECUTE FUNCTION public.sp_apply_stock_tenue_classe();
