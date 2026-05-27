
REVOKE EXECUTE ON FUNCTION public.consume_sms_otp(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_sms_otp(UUID, TEXT, TEXT) TO service_role;
