-- Téléphones autorisés à recevoir les notifications natives La Providence.
CREATE TABLE public.appareils_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (length(token) BETWEEN 20 AND 4096),
  plateforme text NOT NULL CHECK (plateforme IN ('android', 'ios', 'web')),
  actif boolean NOT NULL DEFAULT true,
  derniere_activite timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appareils_notifications_ecole_actifs_idx
  ON public.appareils_notifications (ecole_id, actif)
  WHERE actif = true;

ALTER TABLE public.appareils_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY appareils_notifications_select_self
  ON public.appareils_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY appareils_notifications_delete_self
  ON public.appareils_notifications FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE ON public.appareils_notifications FROM authenticated;

CREATE OR REPLACE FUNCTION public.enregistrer_appareil_notification(
  _token text,
  _ecole_id uuid,
  _plateforme text DEFAULT 'android'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _token IS NULL OR length(trim(_token)) NOT BETWEEN 20 AND 4096 THEN
    RAISE EXCEPTION 'token_invalide';
  END IF;
  IF _plateforme NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'plateforme_invalide';
  END IF;
  IF NOT private.user_belongs_to_ecole(v_user, _ecole_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.appareils_notifications (
    user_id, ecole_id, token, plateforme, actif, derniere_activite, updated_at
  ) VALUES (
    v_user, _ecole_id, trim(_token), _plateforme, true, now(), now()
  )
  ON CONFLICT (token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    ecole_id = EXCLUDED.ecole_id,
    plateforme = EXCLUDED.plateforme,
    actif = true,
    derniere_activite = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_appareil_notification(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_appareil_notification(text, uuid, text) TO authenticated;

COMMENT ON TABLE public.appareils_notifications IS
  'Jetons de notification des appareils mobiles, isolés par utilisateur et école.';
