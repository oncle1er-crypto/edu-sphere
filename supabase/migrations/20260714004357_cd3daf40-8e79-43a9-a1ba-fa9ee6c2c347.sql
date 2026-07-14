
-- 1) Synchroniser les grilles manquantes de grille_tarifs_niveaux vers frais_scolarite
--    (source d'options du dropdown "Grille tarifaire personnalisée")
INSERT INTO public.frais_scolarite (ecole_id, annee_id, cycle_id, libelle, montant_annuel, nb_tranches)
SELECT g.ecole_id,
       g.annee_id,
       cl.cycle_id,
       'Scolarité — ' || g.libelle,
       g.montant_total,
       COALESCE(jsonb_array_length(g.tranches), 3)
FROM public.grille_tarifs_niveaux g
JOIN LATERAL (
  SELECT DISTINCT c.cycle_id
  FROM public.classes c
  WHERE c.ecole_id = g.ecole_id
    AND c.annee_id = g.annee_id
    AND public.resoudre_niveau_code(c.nom) = g.niveau_code
  LIMIT 1
) cl ON TRUE
ON CONFLICT (ecole_id, annee_id, cycle_id, libelle) DO UPDATE
  SET montant_annuel = EXCLUDED.montant_annuel,
      nb_tranches    = EXCLUDED.nb_tranches,
      updated_at     = now();

-- 2) Nettoyer les tranches obsolètes : pour tout élève qui a des tranches
--    sur plusieurs frais_id, on garde uniquement celles rattachées au frais
--    ayant reçu au moins un paiement (ou le plus récent) et on supprime les
--    autres tranches sans aucun paiement.
WITH multi AS (
  SELECT eleve_id FROM public.tranches
  GROUP BY eleve_id HAVING COUNT(DISTINCT frais_id) > 1
),
keeper AS (
  SELECT DISTINCT ON (t.eleve_id) t.eleve_id, t.frais_id
  FROM public.tranches t
  WHERE t.eleve_id IN (SELECT eleve_id FROM multi)
  ORDER BY t.eleve_id, t.paye DESC, t.updated_at DESC
)
DELETE FROM public.tranches t
USING keeper k
WHERE t.eleve_id = k.eleve_id
  AND t.frais_id <> k.frais_id
  AND t.paye = 0
  AND NOT EXISTS (SELECT 1 FROM public.paiements p WHERE p.tranche_id = t.id);
