
-- Module
INSERT INTO public.app_modules (key, label, ordre)
VALUES ('vie_scolaire', 'Vie scolaire', 95)
ON CONFLICT (key) DO NOTHING;

-- Séquences
CREATE SEQUENCE IF NOT EXISTS public.seq_billet_sortie START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_certificat_absence START 1;

-- Billets de sortie
CREATE TABLE IF NOT EXISTS public.billets_sortie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  numero text NOT NULL DEFAULT ('BS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_billet_sortie')::text, 5, '0')),
  sujet_type text NOT NULL CHECK (sujet_type IN ('eleve','enseignant','personnel')),
  eleve_id uuid REFERENCES public.eleves(id) ON DELETE SET NULL,
  enseignant_id uuid REFERENCES public.enseignants(id) ON DELETE SET NULL,
  motif text NOT NULL,
  date_sortie date NOT NULL DEFAULT current_date,
  heure_sortie time NOT NULL DEFAULT current_time,
  heure_retour_prevue time,
  heure_retour_effective time,
  accompagnateur text,
  destination text,
  observations text,
  delivre_par uuid,
  statut text NOT NULL DEFAULT 'emis' CHECK (statut IN ('emis','retourne','annule')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billets_sortie_subject_check CHECK (
    (sujet_type = 'eleve' AND eleve_id IS NOT NULL)
    OR (sujet_type IN ('enseignant','personnel') AND enseignant_id IS NOT NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billets_sortie TO authenticated;
GRANT ALL ON public.billets_sortie TO service_role;
ALTER TABLE public.billets_sortie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vs_billets_select" ON public.billets_sortie FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.ecole_id = billets_sortie.ecole_id));

CREATE POLICY "vs_billets_insert" ON public.billets_sortie FOR INSERT TO authenticated
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::public.app_role)
);

CREATE POLICY "vs_billets_update" ON public.billets_sortie FOR UPDATE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::public.app_role)
);

CREATE POLICY "vs_billets_delete" ON public.billets_sortie FOR DELETE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
);

CREATE INDEX IF NOT EXISTS idx_billets_sortie_ecole ON public.billets_sortie(ecole_id, date_sortie DESC);

-- Certificats d'absence
CREATE TABLE IF NOT EXISTS public.certificats_absence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  numero text NOT NULL DEFAULT ('CA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_certificat_absence')::text, 5, '0')),
  sujet_type text NOT NULL CHECK (sujet_type IN ('eleve','enseignant','personnel')),
  eleve_id uuid REFERENCES public.eleves(id) ON DELETE SET NULL,
  enseignant_id uuid REFERENCES public.enseignants(id) ON DELETE SET NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  motif text NOT NULL,
  justifie boolean NOT NULL DEFAULT true,
  type_justificatif text,
  piece_jointe_url text,
  observations text,
  delivre_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificats_absence_subject_check CHECK (
    (sujet_type = 'eleve' AND eleve_id IS NOT NULL)
    OR (sujet_type IN ('enseignant','personnel') AND enseignant_id IS NOT NULL)
  ),
  CONSTRAINT certificats_absence_dates_check CHECK (date_fin >= date_debut)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificats_absence TO authenticated;
GRANT ALL ON public.certificats_absence TO service_role;
ALTER TABLE public.certificats_absence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vs_certifs_select" ON public.certificats_absence FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.ecole_id = certificats_absence.ecole_id));

CREATE POLICY "vs_certifs_insert" ON public.certificats_absence FOR INSERT TO authenticated
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::public.app_role)
);

CREATE POLICY "vs_certifs_update" ON public.certificats_absence FOR UPDATE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'educateur'::public.app_role)
);

CREATE POLICY "vs_certifs_delete" ON public.certificats_absence FOR DELETE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
);

CREATE INDEX IF NOT EXISTS idx_certifs_ecole ON public.certificats_absence(ecole_id, date_debut DESC);

-- Triggers updated_at
CREATE TRIGGER trg_billets_sortie_updated BEFORE UPDATE ON public.billets_sortie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_certifs_absence_updated BEFORE UPDATE ON public.certificats_absence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
