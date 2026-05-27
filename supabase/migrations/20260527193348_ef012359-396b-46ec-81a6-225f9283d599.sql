DROP FUNCTION IF EXISTS public.detect_all_conflicts(uuid, uuid);
CREATE OR REPLACE FUNCTION public.detect_all_conflicts(_ecole_id uuid, _annee_id uuid)
RETURNS TABLE (
  type text,
  severity text,
  jour integer,
  heure_debut time,
  heure_fin time,
  description text,
  creneau_ids uuid[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT private.user_belongs_to_ecole(auth.uid(), _ecole_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  RETURN QUERY
  SELECT 'enseignant'::text, 'critique'::text,
         a.jour::int, a.heure_debut, a.heure_fin,
         (e.prenom || ' ' || e.nom || ' assigné à ' || ca.nom || ' et ' || cb.nom)::text,
         ARRAY[a.id, b.id]
  FROM creneaux_emploi_temps a
  JOIN creneaux_emploi_temps b ON b.id > a.id
    AND b.ecole_id = a.ecole_id AND b.annee_id = a.annee_id
    AND b.jour = a.jour
    AND a.enseignant_id IS NOT NULL AND b.enseignant_id = a.enseignant_id
    AND a.heure_debut < b.heure_fin AND b.heure_debut < a.heure_fin
  JOIN enseignants e ON e.id = a.enseignant_id
  JOIN classes ca ON ca.id = a.classe_id
  JOIN classes cb ON cb.id = b.classe_id
  WHERE a.ecole_id = _ecole_id AND a.annee_id = _annee_id;

  RETURN QUERY
  SELECT 'classe'::text, 'critique'::text,
         a.jour::int, a.heure_debut, a.heure_fin,
         (c.nom || ' a deux cours simultanés (' || ma.nom || ' / ' || mb.nom || ')')::text,
         ARRAY[a.id, b.id]
  FROM creneaux_emploi_temps a
  JOIN creneaux_emploi_temps b ON b.id > a.id
    AND b.ecole_id = a.ecole_id AND b.annee_id = a.annee_id
    AND b.classe_id = a.classe_id
    AND b.jour = a.jour
    AND a.heure_debut < b.heure_fin AND b.heure_debut < a.heure_fin
  JOIN classes c ON c.id = a.classe_id
  JOIN matieres ma ON ma.id = a.matiere_id
  JOIN matieres mb ON mb.id = b.matiere_id
  WHERE a.ecole_id = _ecole_id AND a.annee_id = _annee_id;

  RETURN QUERY
  SELECT 'salle'::text, 'critique'::text,
         a.jour::int, a.heure_debut, a.heure_fin,
         ('Salle ' || COALESCE(s.code, a.salle) || ' occupée par ' || ca.nom || ' et ' || cb.nom)::text,
         ARRAY[a.id, b.id]
  FROM creneaux_emploi_temps a
  JOIN creneaux_emploi_temps b ON b.id > a.id
    AND b.ecole_id = a.ecole_id AND b.annee_id = a.annee_id
    AND b.jour = a.jour
    AND a.heure_debut < b.heure_fin AND b.heure_debut < a.heure_fin
    AND (
      (a.salle_id IS NOT NULL AND a.salle_id = b.salle_id)
      OR (a.salle_id IS NULL AND b.salle_id IS NULL
          AND a.salle IS NOT NULL AND length(btrim(a.salle)) > 0
          AND a.salle = b.salle)
    )
  LEFT JOIN salles s ON s.id = a.salle_id
  JOIN classes ca ON ca.id = a.classe_id
  JOIN classes cb ON cb.id = b.classe_id
  WHERE a.ecole_id = _ecole_id AND a.annee_id = _annee_id;

  RETURN QUERY
  SELECT 'indisponibilite'::text, 'avertissement'::text,
         c.jour::int, c.heure_debut, c.heure_fin,
         (e.prenom || ' ' || e.nom || ' programmé sur une plage marquée indisponible (' ||
          CASE d.plage WHEN 'matin' THEN 'matin' ELSE 'après-midi' END || ')')::text,
         ARRAY[c.id]
  FROM creneaux_emploi_temps c
  JOIN enseignants e ON e.id = c.enseignant_id
  JOIN disponibilites_enseignants d
    ON d.enseignant_id = c.enseignant_id
   AND d.jour = c.jour
   AND d.disponible = false
   AND (
     (d.plage = 'matin' AND c.heure_debut < time '12:30')
     OR (d.plage = 'apres_midi' AND c.heure_fin > time '12:30')
   )
  WHERE c.ecole_id = _ecole_id AND c.annee_id = _annee_id
    AND c.enseignant_id IS NOT NULL;

  RETURN QUERY
  WITH actual AS (
    SELECT c.classe_id, c.matiere_id,
           SUM(EXTRACT(EPOCH FROM (c.heure_fin - c.heure_debut))/3600.0)::numeric AS h
    FROM creneaux_emploi_temps c
    WHERE c.ecole_id = _ecole_id AND c.annee_id = _annee_id
    GROUP BY c.classe_id, c.matiere_id
  )
  SELECT 'volume'::text,
         (CASE WHEN actual.h > cm.volume_horaire_hebdo THEN 'critique' ELSE 'avertissement' END)::text,
         NULL::int, NULL::time, NULL::time,
         (cl.nom || ' / ' || m.nom || ' : ' || round(actual.h, 1) || 'h programmées vs ' ||
          cm.volume_horaire_hebdo || 'h prévues')::text,
         ARRAY[]::uuid[]
  FROM actual
  JOIN classe_matieres cm
    ON cm.classe_id = actual.classe_id AND cm.matiere_id = actual.matiere_id
   AND cm.ecole_id = _ecole_id
  JOIN classes cl ON cl.id = actual.classe_id
  JOIN matieres m ON m.id = actual.matiere_id
  WHERE cm.volume_horaire_hebdo IS NOT NULL
    AND ABS(actual.h - cm.volume_horaire_hebdo) >= 0.5;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.detect_all_conflicts(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_all_conflicts(uuid, uuid) TO authenticated;