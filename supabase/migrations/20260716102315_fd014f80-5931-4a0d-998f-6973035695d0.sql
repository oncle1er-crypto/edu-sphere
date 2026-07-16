
-- 1) Recabler tranches / overrides des doublons "Scolarité — X" vers la grille canonique "X"
WITH canon AS (
  SELECT id AS canon_id, ecole_id, annee_id,
         regexp_replace(libelle, '^\s*Scolarité\s*—\s*', '') AS norm_lib
  FROM public.frais_scolarite
  WHERE libelle NOT ILIKE 'Scolarité —%'
),
dup AS (
  SELECT d.id AS dup_id, c.canon_id
  FROM public.frais_scolarite d
  JOIN canon c
    ON c.ecole_id=d.ecole_id AND c.annee_id=d.annee_id
   AND c.norm_lib = regexp_replace(d.libelle, '^\s*Scolarité\s*—\s*', '')
   AND c.canon_id <> d.id
)
UPDATE public.tranches t SET frais_id = dup.canon_id FROM dup WHERE t.frais_id = dup.dup_id;

WITH canon AS (
  SELECT id AS canon_id, ecole_id, annee_id,
         regexp_replace(libelle, '^\s*Scolarité\s*—\s*', '') AS norm_lib
  FROM public.frais_scolarite
  WHERE libelle NOT ILIKE 'Scolarité —%'
),
dup AS (
  SELECT d.id AS dup_id, c.canon_id
  FROM public.frais_scolarite d
  JOIN canon c
    ON c.ecole_id=d.ecole_id AND c.annee_id=d.annee_id
   AND c.norm_lib = regexp_replace(d.libelle, '^\s*Scolarité\s*—\s*', '')
   AND c.canon_id <> d.id
)
UPDATE public.eleves e SET frais_id_override = dup.canon_id FROM dup WHERE e.frais_id_override = dup.dup_id;

DELETE FROM public.frais_scolarite d
WHERE d.libelle ILIKE 'Scolarité —%'
  AND EXISTS (
    SELECT 1 FROM public.frais_scolarite c
    WHERE c.ecole_id=d.ecole_id AND c.annee_id=d.annee_id
      AND c.libelle = regexp_replace(d.libelle, '^\s*Scolarité\s*—\s*', '')
  );

-- 2) Fusionner "Scolarité — Maternelle 2" vers "Moyenne Section" si existant
WITH dup AS (
  SELECT d.id AS dup_id, c.id AS canon_id
  FROM public.frais_scolarite d
  JOIN public.frais_scolarite c
    ON c.ecole_id=d.ecole_id AND c.annee_id=d.annee_id AND c.libelle='Moyenne Section'
  WHERE d.libelle='Scolarité — Maternelle 2'
)
UPDATE public.tranches t SET frais_id=dup.canon_id FROM dup WHERE t.frais_id=dup.dup_id;

DELETE FROM public.frais_scolarite d
WHERE d.libelle='Scolarité — Maternelle 2'
  AND EXISTS (SELECT 1 FROM public.frais_scolarite c
              WHERE c.libelle='Moyenne Section' AND c.ecole_id=d.ecole_id AND c.annee_id=d.annee_id);

-- 3) Retirer le préfixe "Scolarité — " des lignes restantes
UPDATE public.frais_scolarite
SET libelle = regexp_replace(libelle, '^\s*Scolarité\s*—\s*', '')
WHERE libelle ILIKE 'Scolarité —%';

-- 4) Ancien/Nouveau pour MAT1/MAT2. Le trigger AFTER INSERT régénère les tranches
--    et peut re-créer des lignes frais_scolarite via `generer_tranches_eleve`,
--    ce qui provoque un conflit avec nos renommages. On le désactive le temps
--    de la mise à jour.
ALTER TABLE public.frais_scolarite DISABLE TRIGGER frais_generer_tranches;

UPDATE public.frais_scolarite SET libelle='Petite Section — Ancien'  WHERE libelle='Petite Section';
UPDATE public.frais_scolarite SET libelle='Moyenne Section — Ancien' WHERE libelle='Moyenne Section';

INSERT INTO public.frais_scolarite (ecole_id, annee_id, cycle_id, libelle, montant_annuel, nb_tranches)
SELECT ecole_id, annee_id, cycle_id, 'Petite Section — Nouveau', 145000, nb_tranches
FROM public.frais_scolarite f
WHERE libelle='Petite Section — Ancien'
  AND NOT EXISTS (SELECT 1 FROM public.frais_scolarite g
    WHERE g.ecole_id=f.ecole_id AND g.annee_id=f.annee_id AND g.libelle='Petite Section — Nouveau');

INSERT INTO public.frais_scolarite (ecole_id, annee_id, cycle_id, libelle, montant_annuel, nb_tranches)
SELECT ecole_id, annee_id, cycle_id, 'Moyenne Section — Nouveau', 145000, nb_tranches
FROM public.frais_scolarite f
WHERE libelle='Moyenne Section — Ancien'
  AND NOT EXISTS (SELECT 1 FROM public.frais_scolarite g
    WHERE g.ecole_id=f.ecole_id AND g.annee_id=f.annee_id AND g.libelle='Moyenne Section — Nouveau');

ALTER TABLE public.frais_scolarite ENABLE TRIGGER frais_generer_tranches;
