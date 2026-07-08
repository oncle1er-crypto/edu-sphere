
ALTER TABLE public.parametres_matieres
  ADD COLUMN IF NOT EXISTS systeme_notation text NOT NULL DEFAULT '20',
  ADD COLUMN IF NOT EXISTS decimales_affichees int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS arrondi text NOT NULL DEFAULT 'arithmetique',
  ADD COLUMN IF NOT EXISTS autoriser_notes_hors_bareme boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afficher_mentions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS afficher_rang boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS afficher_appreciation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS texte_pied_bulletin text,
  ADD COLUMN IF NOT EXISTS signature_directeur_url text;
