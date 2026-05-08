
-- Extend ecoles
ALTER TABLE public.ecoles
  ADD COLUMN IF NOT EXISTS sigle text,
  ADD COLUMN IF NOT EXISTS cycles text,
  ADD COLUMN IF NOT EXISTS diocese text,
  ADD COLUMN IF NOT EXISTS agrement text,
  ADD COLUMN IF NOT EXISTS annee_creation integer,
  ADD COLUMN IF NOT EXISTS site_web text;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fonction text,
  ADD COLUMN IF NOT EXISTS langue text DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Localization settings table
CREATE TABLE IF NOT EXISTS public.parametres_localisation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL UNIQUE,
  langue text NOT NULL DEFAULT 'fr',
  fuseau text NOT NULL DEFAULT 'africa-abidjan',
  format_date text NOT NULL DEFAULT 'dd-mm-yyyy',
  format_heure text NOT NULL DEFAULT '24h',
  premier_jour text NOT NULL DEFAULT 'monday',
  separateur_decimal text NOT NULL DEFAULT 'comma',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parametres_localisation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.parametres_localisation
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.parametres_localisation
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parametres_localisation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

-- Logos policies (folder = ecole_id)
CREATE POLICY "Logos publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "School admins upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND (
      has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role) OR
      has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    )
  );

CREATE POLICY "School admins update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos' AND (
      has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role) OR
      has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    )
  );

CREATE POLICY "School admins delete logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos' AND (
      has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::app_role) OR
      has_ecole_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'directeur'::app_role)
    )
  );

-- Avatars policies (folder = user id)
CREATE POLICY "Avatars publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
