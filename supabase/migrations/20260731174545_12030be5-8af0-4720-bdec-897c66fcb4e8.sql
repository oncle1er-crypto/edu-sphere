ALTER TABLE public.finance_settings
  ADD COLUMN IF NOT EXISTS frais_inscription numeric NOT NULL DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS frais_uniformes numeric NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS frais_activites numeric NOT NULL DEFAULT 15000;