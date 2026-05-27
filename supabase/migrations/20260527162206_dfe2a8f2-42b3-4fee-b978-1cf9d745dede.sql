ALTER TABLE public.mfa_sms_factors
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- Backfill: les facteurs déjà "verified" sont considérés vérifiés ET actifs (rétro-compat)
UPDATE public.mfa_sms_factors
  SET phone_verified_at = COALESCE(phone_verified_at, updated_at),
      activated_at      = COALESCE(activated_at, updated_at),
      is_active         = true
  WHERE verified = true AND activated_at IS NULL;