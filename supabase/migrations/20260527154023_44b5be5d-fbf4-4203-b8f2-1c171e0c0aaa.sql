
-- ============== SECURITY AUDIT LOGS ==============
CREATE TABLE public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ecole_id uuid,
  event_type text NOT NULL,
  event_severity text NOT NULL DEFAULT 'info',
  ip_address text,
  user_agent text,
  device_fingerprint text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_logs_user ON public.security_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_security_logs_ecole ON public.security_audit_logs(ecole_id, created_at DESC);
CREATE INDEX idx_security_logs_type ON public.security_audit_logs(event_type);

GRANT SELECT, INSERT ON public.security_audit_logs TO authenticated;
GRANT ALL ON public.security_audit_logs TO service_role;

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own security logs"
ON public.security_audit_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Ecole admins see ecole logs"
ON public.security_audit_logs FOR SELECT
TO authenticated
USING (
  ecole_id IS NOT NULL AND (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  )
);

CREATE POLICY "Authenticated insert security logs"
ON public.security_audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- ============== MFA BACKUP CODES ==============
CREATE TABLE public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_backup_codes_user ON public.mfa_backup_codes(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_backup_codes TO authenticated;
GRANT ALL ON public.mfa_backup_codes TO service_role;

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own backup codes meta"
ON public.mfa_backup_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own backup codes"
ON public.mfa_backup_codes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own backup codes"
ON public.mfa_backup_codes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============== TRUSTED DEVICES ==============
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_name text,
  user_agent text,
  ip_address text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  trusted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX idx_trusted_devices_user ON public.trusted_devices(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_devices TO authenticated;
GRANT ALL ON public.trusted_devices TO service_role;

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own devices"
ON public.trusted_devices FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============== MFA REQUIREMENTS ==============
CREATE TABLE public.mfa_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  role app_role NOT NULL,
  required boolean NOT NULL DEFAULT true,
  grace_period_days int NOT NULL DEFAULT 7,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, role)
);

GRANT SELECT ON public.mfa_requirements TO authenticated;
GRANT ALL ON public.mfa_requirements TO service_role;

ALTER TABLE public.mfa_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ecole members read mfa requirements"
ON public.mfa_requirements FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.ecole_id = mfa_requirements.ecole_id)
);

CREATE POLICY "Admins manage mfa requirements"
ON public.mfa_requirements FOR ALL
TO authenticated
USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role))
WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));

-- Seed defaults pour les rôles critiques (toutes écoles existantes)
INSERT INTO public.mfa_requirements (ecole_id, role, required, grace_period_days)
SELECT e.id, r.role, true, 7
FROM public.ecoles e
CROSS JOIN (VALUES ('admin'::app_role), ('directeur'::app_role), ('comptable'::app_role)) r(role)
ON CONFLICT (ecole_id, role) DO NOTHING;

-- ============== MFA FAILED ATTEMPTS ==============
CREATE TABLE public.mfa_failed_attempts (
  user_id uuid PRIMARY KEY,
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mfa_failed_attempts TO authenticated;
GRANT ALL ON public.mfa_failed_attempts TO service_role;

ALTER TABLE public.mfa_failed_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own failed attempts"
ON public.mfa_failed_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own failed attempts"
ON public.mfa_failed_attempts FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============== FUNCTIONS ==============

-- Log security event
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity text DEFAULT 'info',
  _ecole_id uuid DEFAULT NULL,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _device_fp text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id, ecole_id, event_type, event_severity,
    ip_address, user_agent, device_fingerprint, metadata
  ) VALUES (
    auth.uid(), _ecole_id, _event_type, _severity,
    _ip, _user_agent, _device_fp, COALESCE(_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Vérifie si MFA obligatoire pour l'utilisateur courant dans une école
CREATE OR REPLACE FUNCTION public.is_mfa_required_for_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.mfa_requirements mr ON mr.ecole_id = ur.ecole_id AND mr.role = ur.role
    WHERE ur.user_id = _user_id AND mr.required = true
  );
$$;

-- Consomme un backup code (vérification + marquage utilisé)
CREATE OR REPLACE FUNCTION public.consume_backup_code(_code_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  SELECT id INTO v_id
  FROM public.mfa_backup_codes
  WHERE user_id = auth.uid() AND code_hash = _code_hash AND used_at IS NULL
  LIMIT 1;

  IF v_id IS NULL THEN
    PERFORM public.log_security_event('mfa_backup_code_invalid', 'warning');
    RETURN false;
  END IF;

  UPDATE public.mfa_backup_codes SET used_at = now() WHERE id = v_id;
  PERFORM public.log_security_event('mfa_backup_code_used', 'info');
  RETURN true;
END;
$$;

-- Gestion anti brute-force MFA
CREATE OR REPLACE FUNCTION public.register_failed_mfa()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts int;
  v_locked_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'attempts', 0);
  END IF;

  INSERT INTO public.mfa_failed_attempts (user_id, attempts, last_attempt_at)
  VALUES (auth.uid(), 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET attempts = mfa_failed_attempts.attempts + 1,
        last_attempt_at = now(),
        locked_until = CASE
          WHEN mfa_failed_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE mfa_failed_attempts.locked_until
        END
  RETURNING attempts, locked_until INTO v_attempts, v_locked_until;

  PERFORM public.log_security_event(
    'mfa_failed_attempt',
    CASE WHEN v_attempts >= 5 THEN 'critical' ELSE 'warning' END,
    NULL, NULL, NULL, NULL,
    jsonb_build_object('attempts', v_attempts)
  );

  RETURN jsonb_build_object(
    'locked', v_locked_until IS NOT NULL AND v_locked_until > now(),
    'attempts', v_attempts,
    'locked_until', v_locked_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_failed_mfa()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  DELETE FROM public.mfa_failed_attempts WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_mfa_locked(_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mfa_failed_attempts
    WHERE user_id = COALESCE(_user_id, auth.uid())
      AND locked_until IS NOT NULL
      AND locked_until > now()
  );
$$;

-- Réinitialisation MFA par admin (audit obligatoire)
CREATE OR REPLACE FUNCTION public.admin_reset_user_mfa(_target_user_id uuid, _ecole_id uuid, _motif text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF NOT private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 5 THEN
    RAISE EXCEPTION 'Motif obligatoire (5 caractères minimum)';
  END IF;

  -- Suppression backup codes et device trust
  DELETE FROM public.mfa_backup_codes WHERE user_id = _target_user_id;
  UPDATE public.trusted_devices SET revoked_at = now()
    WHERE user_id = _target_user_id AND revoked_at IS NULL;
  DELETE FROM public.mfa_failed_attempts WHERE user_id = _target_user_id;

  INSERT INTO public.security_audit_logs (user_id, ecole_id, event_type, event_severity, metadata)
  VALUES (
    _target_user_id, _ecole_id, 'mfa_reset_by_admin', 'critical',
    jsonb_build_object('admin_id', auth.uid(), 'motif', _motif)
  );
END;
$$;
