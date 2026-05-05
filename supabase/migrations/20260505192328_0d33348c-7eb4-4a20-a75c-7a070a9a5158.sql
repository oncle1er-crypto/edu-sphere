-- SMS provider config per school
CREATE TABLE public.sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'yellikasms',
  api_token TEXT NOT NULL DEFAULT '',
  sender_id TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL DEFAULT 'https://panel.yellikasms.com/api/v3/sms/send',
  is_active BOOLEAN NOT NULL DEFAULT false,
  cout_unitaire INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id)
);

ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sms_config"
  ON public.sms_config FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "Admins can manage sms_config"
  ON public.sms_config FOR ALL
  TO authenticated
  USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin'))
  WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin'));

CREATE TRIGGER update_sms_config_updated_at
  BEFORE UPDATE ON public.sms_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- SMS send logs
CREATE TABLE public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  destinataire TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id TEXT NOT NULL DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','envoye','echoue')),
  provider_response JSONB,
  cout INTEGER NOT NULL DEFAULT 0,
  envoye_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sms_logs"
  ON public.sms_logs FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "Authenticated can insert sms_logs"
  ON public.sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE INDEX idx_sms_logs_ecole ON public.sms_logs(ecole_id);
CREATE INDEX idx_sms_logs_statut ON public.sms_logs(statut);
CREATE INDEX idx_sms_logs_created ON public.sms_logs(created_at DESC);