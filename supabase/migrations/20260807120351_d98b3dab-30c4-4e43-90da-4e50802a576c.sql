ALTER TABLE public.zindua_config
  ADD COLUMN IF NOT EXISTS template_recu text DEFAULT 'recu-paiement',
  ADD COLUMN IF NOT EXISTS envoi_auto_recu boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.zindua_verifier_envoi(_ecole_id uuid, _destinataire text, _usage text DEFAULT 'otp'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHEN 'recu' THEN c.template_recu
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
$function$;