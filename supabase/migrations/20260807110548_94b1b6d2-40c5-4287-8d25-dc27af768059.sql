ALTER TABLE public.zindua_config
  ADD COLUMN IF NOT EXISTS template_test text NOT NULL DEFAULT 'otp-verification',
  ADD COLUMN IF NOT EXISTS template_relance text NOT NULL DEFAULT 'relance-impaye',
  ADD COLUMN IF NOT EXISTS template_echeance text NOT NULL DEFAULT 'rappel-echeance',
  ADD COLUMN IF NOT EXISTS template_bulletin text NOT NULL DEFAULT 'bulletin-disponible';

DROP FUNCTION IF EXISTS public.zindua_verifier_envoi(uuid, text);

CREATE OR REPLACE FUNCTION public.zindua_verifier_envoi(
  _ecole_id uuid,
  _destinataire text,
  _usage text DEFAULT 'otp'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD; v_dernier timestamptz; v_attente int; v_utilises int; v_template text;
BEGIN
  SELECT * INTO c FROM zindua_config WHERE ecole_id = _ecole_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('autorise', false, 'raison', 'config_absente'); END IF;
  IF NOT c.enabled THEN RETURN jsonb_build_object('autorise', false, 'raison', 'zindua_desactive'); END IF;
  IF NOT c.whatsapp_enabled THEN RETURN jsonb_build_object('autorise', false, 'raison', 'canal_whatsapp_desactive'); END IF;
  IF c.test_mode AND NOT (_destinataire = ANY (c.test_destinataires)) THEN
    RETURN jsonb_build_object('autorise', false, 'raison', 'destinataire_non_autorise_en_test');
  END IF;

  v_template := CASE lower(coalesce(_usage, 'otp'))
    WHEN 'test' THEN c.template_test
    WHEN 'relance' THEN c.template_relance
    WHEN 'echeance' THEN c.template_echeance
    WHEN 'bulletin' THEN c.template_bulletin
    ELSE c.template_otp
  END;

  SELECT count(*) INTO v_utilises FROM sms_logs
   WHERE ecole_id = _ecole_id AND provider = 'zindua'
     AND created_at >= date_trunc('month', now())
     AND statut NOT IN ('echec','echoue');
  IF v_utilises >= c.quota_mensuel THEN
    RETURN jsonb_build_object('autorise', false, 'raison', 'quota_mensuel_atteint',
                              'utilises', v_utilises, 'quota', c.quota_mensuel);
  END IF;

  SELECT max(created_at) INTO v_dernier FROM sms_logs
   WHERE ecole_id = _ecole_id AND provider = 'zindua' AND canal = 'whatsapp';
  IF v_dernier IS NOT NULL THEN
    v_attente := c.intervalle_min_secondes - FLOOR(EXTRACT(EPOCH FROM (now() - v_dernier)))::int;
    IF v_attente > 0 THEN
      RETURN jsonb_build_object('autorise', false, 'raison', 'cadence_trop_rapide', 'attente_secondes', v_attente);
    END IF;
  END IF;

  RETURN jsonb_build_object('autorise', true,
                            'template', v_template,
                            'template_otp', c.template_otp,
                            'api_base_url', c.api_base_url,
                            'restant_ce_mois', c.quota_mensuel - v_utilises);
END;
$$;

REVOKE ALL ON FUNCTION public.zindua_verifier_envoi(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.zindua_verifier_envoi(uuid, text, text) TO authenticated, service_role;