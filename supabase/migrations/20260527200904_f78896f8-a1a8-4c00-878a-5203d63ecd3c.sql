ALTER TABLE public.eleves
  ADD COLUMN IF NOT EXISTS matricule_national TEXT,
  ADD COLUMN IF NOT EXISTS numero_inscription_en_ligne TEXT;