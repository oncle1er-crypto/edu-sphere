
CREATE TABLE public.mfa_sms_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ecole_id UUID,
  phone TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  friendly_name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_sms_factors TO authenticated;
GRANT ALL ON public.mfa_sms_factors TO service_role;

ALTER TABLE public.mfa_sms_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sms factor" ON public.mfa_sms_factors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sms factor" ON public.mfa_sms_factors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sms factor" ON public.mfa_sms_factors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sms factor" ON public.mfa_sms_factors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.mfa_sms_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'enroll', -- 'enroll' | 'challenge'
  attempts INT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mfa_sms_otp_codes TO authenticated;
GRANT ALL ON public.mfa_sms_otp_codes TO service_role;

ALTER TABLE public.mfa_sms_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sms otp" ON public.mfa_sms_otp_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_mfa_sms_otp_user_active
  ON public.mfa_sms_otp_codes (user_id, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE OR REPLACE FUNCTION public.consume_sms_otp(
  _user_id UUID,
  _code_hash TEXT,
  _purpose TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mfa_sms_otp_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.mfa_sms_otp_codes
  WHERE user_id = _user_id
    AND purpose = _purpose
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_row.expires_at < now() THEN RETURN false; END IF;
  IF v_row.attempts >= 5 THEN RETURN false; END IF;

  IF v_row.code_hash = _code_hash THEN
    UPDATE public.mfa_sms_otp_codes
    SET consumed_at = now(), attempts = v_row.attempts + 1
    WHERE id = v_row.id;
    RETURN true;
  ELSE
    UPDATE public.mfa_sms_otp_codes
    SET attempts = v_row.attempts + 1
    WHERE id = v_row.id;
    RETURN false;
  END IF;
END;
$$;
