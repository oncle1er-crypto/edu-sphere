-- 1. Table de configuration Emploi du temps
CREATE TABLE public.parametres_emploi_temps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL UNIQUE REFERENCES public.ecoles(id) ON DELETE CASCADE,
  -- Horaires
  heure_debut time NOT NULL DEFAULT '08:00',
  heure_fin time NOT NULL DEFAULT '17:00',
  duree_creneau_min integer NOT NULL DEFAULT 60,
  duree_recreation_min integer NOT NULL DEFAULT 15,
  pause_dej_debut time NOT NULL DEFAULT '12:00',
  pause_dej_fin time NOT NULL DEFAULT '14:00',
  jours_ouvres text NOT NULL DEFAULT 'lun-ven' CHECK (jours_ouvres IN ('lun-ven','lun-sam')),
  verrouiller_apres_publication boolean NOT NULL DEFAULT true,
  auto_generer_remplacements boolean NOT NULL DEFAULT false,
  -- Notifications
  notif_modifications boolean NOT NULL DEFAULT true,
  notif_remplacements boolean NOT NULL DEFAULT true,
  notif_annulations boolean NOT NULL DEFAULT true,
  canal_email boolean NOT NULL DEFAULT true,
  canal_sms boolean NOT NULL DEFAULT true,
  canal_push boolean NOT NULL DEFAULT false,
  modele_message text NOT NULL DEFAULT 'Bonjour, le cours de {{matiere}} du {{date}} à {{heure}} pour la classe {{classe}} est {{action}}. Cordialement.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametres_emploi_temps TO authenticated;
GRANT ALL ON public.parametres_emploi_temps TO service_role;

ALTER TABLE public.parametres_emploi_temps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "petemps_read" ON public.parametres_emploi_temps
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "petemps_write" ON public.parametres_emploi_temps
  FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

CREATE TRIGGER trg_petemps_updated_at
  BEFORE UPDATE ON public.parametres_emploi_temps
  FOR EACH ROW EXECUTE FUNCTION public.tg_salles_set_updated_at();

-- 2. Backfill salle_id depuis le texte libre (matching par code de salle)
UPDATE public.creneaux_emploi_temps c
   SET salle_id = s.id
  FROM public.salles s
 WHERE c.salle_id IS NULL
   AND c.salle IS NOT NULL
   AND s.ecole_id = c.ecole_id
   AND lower(trim(s.code)) = lower(trim(c.salle));

-- 3. RPC check_creneau_feasibility
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
      v_errors := v_errors || 'L''enseignant est marqué indisponible sur ce créneau.';
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
      v_errors := v_errors || 'La salle est déjà occupée sur ce créneau.';
    END IF;

    -- 3) Capacité de salle vs effectif (warning uniquement)
    SELECT capacite INTO v_salle_capacite FROM public.salles WHERE id = _salle_id;
    SELECT COUNT(*) INTO v_effectif
      FROM public.eleves
     WHERE classe_id = _classe_id
       AND (statut IS NULL OR statut = 'actif');
    IF v_salle_capacite IS NOT NULL AND v_effectif > 0 AND v_effectif > v_salle_capacite THEN
      v_warnings := v_warnings || format(
        'Effectif (%s) supérieur à la capacité de la salle (%s).',
        v_effectif, v_salle_capacite
      );
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