-- Étendre l'enum carte_type
ALTER TYPE public.carte_type ADD VALUE IF NOT EXISTS 'cantine';
ALTER TYPE public.carte_type ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE public.carte_type ADD VALUE IF NOT EXISTS 'bibliotheque';
ALTER TYPE public.carte_type ADD VALUE IF NOT EXISTS 'visiteur';

-- Étendre l'enum carte_statut
ALTER TYPE public.carte_statut ADD VALUE IF NOT EXISTS 'revoquee';

-- Ajouter colonnes manquantes
ALTER TABLE public.cartes
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS motif_revocation text,
  ADD COLUMN IF NOT EXISTS qr_payload text;

-- Index pour les recherches metadata
CREATE INDEX IF NOT EXISTS idx_cartes_metadata ON public.cartes USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_cartes_type ON public.cartes(type);
CREATE INDEX IF NOT EXISTS idx_cartes_statut ON public.cartes(statut);