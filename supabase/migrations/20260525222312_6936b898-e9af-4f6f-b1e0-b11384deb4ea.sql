
-- Add WhatsApp fields to sms_config
ALTER TABLE public.sms_config
  ADD COLUMN IF NOT EXISTS whatsapp_url text NOT NULL DEFAULT 'https://panel.yellikasms.com/api/v3/whatsapp/send',
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_cout_unitaire integer NOT NULL DEFAULT 50;

-- Add canal column to sms_logs to differentiate SMS vs WhatsApp
ALTER TABLE public.sms_logs
  ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'sms';

CREATE INDEX IF NOT EXISTS sms_logs_canal_idx ON public.sms_logs(canal);
