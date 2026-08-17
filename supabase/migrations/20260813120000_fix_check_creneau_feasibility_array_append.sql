-- Bug réel découvert lors du test fonctionnel de la fonctionnalité
-- « lier enseignant/salle plus tard » (créneaux d'emploi du temps) :
--
-- Dans check_creneau_feasibility (migration 20260708215247), les lignes
--   v_errors := v_errors || 'texte littéral';
--   v_warnings := v_warnings || format('...', ...);
-- utilisent l'opérateur || entre un text[] et un littéral texte NON typé.
-- PostgreSQL résout alors l'opérateur vers la surcharge anyarray || anyarray
-- (au lieu de anyarray || anyelement) et tente de PARSER le texte comme un
-- littéral de tableau, ce qui échoue avec l'erreur :
--   22P02 "malformed array literal" / "Array value must start with "{" ..."
--
-- Conséquence concrète : la RPC ne renvoie une erreur PostgREST (HTTP 400)
-- QUE lorsqu'un vrai conflit doit être signalé (salle déjà occupée,
-- enseignant indisponible, ou capacité dépassée). Côté client
-- (useEmploiDuTemps.ts), cette erreur est interceptée et checkFeasibility()
-- renvoie alors `null` :
--   if (error) { console.error(error); return null; }
-- Le code appelant ne bloque que si `feas && !feas.ok` — avec feas=null,
-- AUCUN blocage ni avertissement n'est déclenché, et l'enregistrement se
-- poursuit silencieusement. Résultat vérifié en local : une salle a pu être
-- assignée à deux créneaux différents au même jour/heure sans le moindre
-- avertissement.
--
-- Correctif : remplacer l'opérateur || par array_append(), qui résout sans
-- ambiguïté vers (anyarray, anyelement) et ne tente jamais de parser le
-- texte comme un tableau. Aucune autre logique n'est modifiée.

CREATE OR REPLACE FUNCTION public.check_creneau_feasibility(
  _ecole_id uuid,
  _annee_id uuid,
  _classe_id uuid,
  _enseignant_id uuid,
  _salle_id uuid,
  _jour integer,
  _heure_debut time,
  _heure_fin time,
  _exclude_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_plage text;
  v_dispo boolean;
  v_salle_capacite integer;
  v_effectif integer;
  v_conflit_salle text;
BEGIN
  -- Contrôle d'appartenance à l'école
  IF NOT private.user_belongs_to_ecole(auth.uid(), _ecole_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- 1) Disponibilité enseignant (matin/après-midi)
  IF _enseignant_id IS NOT NULL THEN
    v_plage := CASE WHEN _heure_debut < '12:00'::time THEN 'matin' ELSE 'apres_midi' END;
    SELECT disponible INTO v_dispo
      FROM public.disponibilites_enseignants
     WHERE enseignant_id = _enseignant_id
       AND jour = _jour
       AND plage = v_plage
     LIMIT 1;
    IF v_dispo IS NOT NULL AND v_dispo = false THEN
      v_errors := array_append(v_errors, 'L''enseignant est marqué indisponible sur ce créneau.'::text);
    END IF;
  END IF;

  -- 2) Salle déjà occupée sur ce créneau
  IF _salle_id IS NOT NULL THEN
    SELECT c.id::text INTO v_conflit_salle
      FROM public.creneaux_emploi_temps c
     WHERE c.ecole_id = _ecole_id
       AND c.annee_id = _annee_id
       AND c.salle_id = _salle_id
       AND c.jour = _jour
       AND (_exclude_id IS NULL OR c.id <> _exclude_id)
       AND c.heure_debut < _heure_fin
       AND c.heure_fin > _heure_debut
     LIMIT 1;
    IF v_conflit_salle IS NOT NULL THEN
      v_errors := array_append(v_errors, 'La salle est déjà occupée sur ce créneau.'::text);
    END IF;

    -- 3) Capacité de salle vs effectif (warning uniquement)
    SELECT capacite INTO v_salle_capacite FROM public.salles WHERE id = _salle_id;
    SELECT COUNT(*) INTO v_effectif
      FROM public.eleves
     WHERE classe_id = _classe_id
       AND (statut IS NULL OR statut = 'actif');
    IF v_salle_capacite IS NOT NULL AND v_effectif > 0 AND v_effectif > v_salle_capacite THEN
      v_warnings := array_append(v_warnings, format(
        'Effectif (%s) supérieur à la capacité de la salle (%s).',
        v_effectif, v_salle_capacite
      ));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(v_errors, 1) IS NULL,
    'errors', to_jsonb(v_errors),
    'warnings', to_jsonb(v_warnings)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_creneau_feasibility(uuid,uuid,uuid,uuid,uuid,integer,time,time,uuid) TO authenticated;
