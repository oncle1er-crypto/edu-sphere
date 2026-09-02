ALTER TABLE public.enseignants
  ADD COLUMN IF NOT EXISTS nombre_enfants_charge integer NOT NULL DEFAULT 0;

ALTER TABLE public.enseignants
  DROP CONSTRAINT IF EXISTS enseignants_nombre_enfants_charge_check,
  ADD CONSTRAINT enseignants_nombre_enfants_charge_check
    CHECK (nombre_enfants_charge BETWEEN 0 AND 20);

ALTER TABLE public.enseignants
  DROP CONSTRAINT IF EXISTS enseignants_parts_fiscales_check,
  ADD CONSTRAINT enseignants_parts_fiscales_check
    CHECK (parts_fiscales BETWEEN 1 AND 5 AND parts_fiscales * 2 = round(parts_fiscales * 2));

-- Le salaire contractuel devient l'unique source de paie. La colonne historique
-- de la fiche reste en place pour ne pas détruire les anciennes données.
DO $migration$
DECLARE
  definition text;
  ancienne_expression constant text := 'COALESCE(NULLIF(c.salaire_base, 0), NULLIF(p.salaire_brut_base, 0), 0)';
BEGIN
  SELECT pg_get_functiondef('public.rh_calculer_bulletin(uuid,uuid,integer,integer,numeric)'::regprocedure)
  INTO definition;

  IF position(ancienne_expression IN definition) = 0 THEN
    RAISE EXCEPTION 'Expression de salaire attendue introuvable dans rh_calculer_bulletin';
  END IF;

  definition := replace(
    definition,
    ancienne_expression,
    'COALESCE(NULLIF(c.salaire_base, 0), 0)'
  );
  definition := replace(
    definition,
    'Aucun salaire de base défini (contrat ou fiche)',
    'Aucun salaire défini sur le contrat actif'
  );
  EXECUTE definition;
END
$migration$;
