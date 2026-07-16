
-- Convertir les grilles MAT1/MAT2 existantes (variant NULL) en variante "ancien"
-- puis créer une copie "nouveau" avec les mêmes tranches pour permettre l'édition ultérieure.

-- 1) Créer les lignes "nouveau" (copie des lignes actuelles sans variante)
INSERT INTO public.grille_tarifs_niveaux
  (ecole_id, annee_id, niveau_code, variant, libelle, tranches)
SELECT
  ecole_id,
  annee_id,
  niveau_code,
  'nouveau'::text,
  regexp_replace(libelle, '\s*—\s*(Ancien|Nouveau)\s*$', '', 'i') || ' — Nouveau',
  tranches
FROM public.grille_tarifs_niveaux g
WHERE niveau_code IN ('MAT1','MAT2')
  AND variant IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.grille_tarifs_niveaux g2
    WHERE g2.ecole_id = g.ecole_id
      AND g2.annee_id = g.annee_id
      AND g2.niveau_code = g.niveau_code
      AND g2.variant = 'nouveau'
  );

-- 2) Marquer les lignes existantes sans variante comme "ancien"
UPDATE public.grille_tarifs_niveaux g
SET variant = 'ancien',
    libelle = regexp_replace(libelle, '\s*—\s*(Ancien|Nouveau)\s*$', '', 'i') || ' — Ancien'
WHERE niveau_code IN ('MAT1','MAT2')
  AND variant IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.grille_tarifs_niveaux g2
    WHERE g2.ecole_id = g.ecole_id
      AND g2.annee_id = g.annee_id
      AND g2.niveau_code = g.niveau_code
      AND g2.variant = 'ancien'
      AND g2.id <> g.id
  );
