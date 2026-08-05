-- Cantine : supprimer le doublon si la fiche de l'année a déjà un abonnement
DELETE FROM public.abonnements_cantine a
USING public.eleves l, public.eleves cur
WHERE l.id = a.eleve_id
  AND l.annee_id <> a.annee_id
  AND cur.matricule = l.matricule AND cur.annee_id = a.annee_id AND cur.ecole_id = l.ecole_id
  AND EXISTS (SELECT 1 FROM public.abonnements_cantine b WHERE b.eleve_id = cur.id AND b.annee_id = a.annee_id);

-- Cantine : sinon réaffecter à la bonne fiche
UPDATE public.abonnements_cantine a
SET eleve_id = cur.id
FROM public.eleves l, public.eleves cur
WHERE l.id = a.eleve_id
  AND l.annee_id <> a.annee_id
  AND cur.matricule = l.matricule AND cur.annee_id = a.annee_id AND cur.ecole_id = l.ecole_id;

-- Transport : idem
DELETE FROM public.abonnements_transport a
USING public.eleves l, public.eleves cur
WHERE l.id = a.eleve_id
  AND l.annee_id <> a.annee_id
  AND cur.matricule = l.matricule AND cur.annee_id = a.annee_id AND cur.ecole_id = l.ecole_id
  AND EXISTS (SELECT 1 FROM public.abonnements_transport b WHERE b.eleve_id = cur.id AND b.annee_id = a.annee_id);

UPDATE public.abonnements_transport a
SET eleve_id = cur.id
FROM public.eleves l, public.eleves cur
WHERE l.id = a.eleve_id
  AND l.annee_id <> a.annee_id
  AND cur.matricule = l.matricule AND cur.annee_id = a.annee_id AND cur.ecole_id = l.ecole_id;