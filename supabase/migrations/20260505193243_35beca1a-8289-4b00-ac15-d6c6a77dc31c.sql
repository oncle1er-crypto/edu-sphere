CREATE OR REPLACE FUNCTION public.decrypt_sms_api_token(_config_id uuid, _passphrase text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE 
    WHEN api_token = '' OR api_token IS NULL THEN ''
    ELSE pgp_sym_decrypt(decode(api_token, 'base64'), _passphrase)
  END
  FROM sms_config
  WHERE id = _config_id
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_sms_api_token(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.decrypt_sms_api_token(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_sms_api_token(uuid, text) FROM authenticated;