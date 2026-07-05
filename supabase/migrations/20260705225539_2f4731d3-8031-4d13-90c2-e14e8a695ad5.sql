CREATE UNIQUE INDEX IF NOT EXISTS annees_scolaires_ecole_debut_uniq
  ON public.annees_scolaires (ecole_id, debut);

CREATE UNIQUE INDEX IF NOT EXISTS annees_scolaires_ecole_libelle_uniq
  ON public.annees_scolaires (ecole_id, lower(btrim(libelle)));