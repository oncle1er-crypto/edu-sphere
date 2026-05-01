
CREATE OR REPLACE FUNCTION public.check_creneau_overlap(
  _ecole_id UUID,
  _annee_id UUID,
  _classe_id UUID,
  _enseignant_id UUID,
  _jour INTEGER,
  _heure_debut TIME,
  _heure_fin TIME,
  _exclude_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conflict TEXT := NULL;
BEGIN
  -- Check class overlap
  SELECT 'La classe a déjà un créneau ' || m.nom || ' de ' || c.heure_debut || ' à ' || c.heure_fin
  INTO _conflict
  FROM creneaux_emploi_temps c
  JOIN matieres m ON m.id = c.matiere_id
  WHERE c.ecole_id = _ecole_id
    AND c.annee_id = _annee_id
    AND c.classe_id = _classe_id
    AND c.jour = _jour
    AND c.heure_debut < _heure_fin
    AND c.heure_fin > _heure_debut
    AND (_exclude_id IS NULL OR c.id != _exclude_id)
  LIMIT 1;

  IF _conflict IS NOT NULL THEN
    RETURN _conflict;
  END IF;

  -- Check teacher overlap
  IF _enseignant_id IS NOT NULL THEN
    SELECT 'L''enseignant a déjà un cours (' || m.nom || ', ' || cl.nom || ') de ' || c.heure_debut || ' à ' || c.heure_fin
    INTO _conflict
    FROM creneaux_emploi_temps c
    JOIN matieres m ON m.id = c.matiere_id
    JOIN classes cl ON cl.id = c.classe_id
    WHERE c.ecole_id = _ecole_id
      AND c.annee_id = _annee_id
      AND c.enseignant_id = _enseignant_id
      AND c.jour = _jour
      AND c.heure_debut < _heure_fin
      AND c.heure_fin > _heure_debut
      AND (_exclude_id IS NULL OR c.id != _exclude_id)
    LIMIT 1;
  END IF;

  RETURN _conflict;
END;
$$;
