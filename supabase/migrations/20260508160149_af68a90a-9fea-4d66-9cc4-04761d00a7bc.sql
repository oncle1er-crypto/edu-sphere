
-- Document templates per school
CREATE TABLE IF NOT EXISTS public.parametres_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL UNIQUE,
  entete text DEFAULT '',
  pied_page text DEFAULT '',
  show_logo boolean NOT NULL DEFAULT true,
  show_cachet boolean NOT NULL DEFAULT true,
  signature_url text,
  prefixe_bulletin text DEFAULT 'BUL-',
  prefixe_certificat text DEFAULT 'CERT-',
  templates_actifs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parametres_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.parametres_documents FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.parametres_documents FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parametres_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Notification settings per school
CREATE TABLE IF NOT EXISTS public.parametres_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL UNIQUE,
  canaux jsonb NOT NULL DEFAULT '{"email":true,"sms":true,"push":false,"whatsapp":false,"inapp":true}'::jsonb,
  evenements jsonb NOT NULL DEFAULT '{}'::jsonb,
  smtp_from_email text DEFAULT '',
  smtp_from_name text DEFAULT '',
  smtp_host text DEFAULT '',
  smtp_port integer DEFAULT 587,
  smtp_user text DEFAULT '',
  silence_de time DEFAULT '21:00',
  silence_a time DEFAULT '07:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parametres_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.parametres_notifications FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.parametres_notifications FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parametres_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  user_id uuid,
  user_label text,
  action text NOT NULL,
  cible text,
  niveau text NOT NULL DEFAULT 'info',
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ecole_date ON public.audit_logs(ecole_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));
CREATE POLICY "auth_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_ecole(auth.uid(), ecole_id));
