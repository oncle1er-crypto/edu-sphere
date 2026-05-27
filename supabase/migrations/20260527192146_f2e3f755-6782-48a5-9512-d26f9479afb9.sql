CREATE OR REPLACE FUNCTION public.tg_salles_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.salles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  nom TEXT,
  type TEXT NOT NULL DEFAULT 'standard',
  capacite INTEGER NOT NULL DEFAULT 35,
  batiment TEXT,
  etage TEXT,
  equipements TEXT[],
  statut TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salles TO authenticated;
GRANT ALL ON public.salles TO service_role;

ALTER TABLE public.salles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salles_read" ON public.salles FOR SELECT TO authenticated
USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "salles_write" ON public.salles FOR ALL TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE TRIGGER trg_salles_updated_at
BEFORE UPDATE ON public.salles
FOR EACH ROW EXECUTE FUNCTION public.tg_salles_set_updated_at();

CREATE INDEX idx_salles_ecole ON public.salles(ecole_id);

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS salle_id UUID REFERENCES public.salles(id) ON DELETE SET NULL;
ALTER TABLE public.creneaux_emploi_temps ADD COLUMN IF NOT EXISTS salle_id UUID REFERENCES public.salles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_salle ON public.classes(salle_id);
CREATE INDEX IF NOT EXISTS idx_creneaux_salle ON public.creneaux_emploi_temps(salle_id);
