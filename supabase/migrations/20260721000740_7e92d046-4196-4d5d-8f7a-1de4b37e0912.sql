
CREATE TABLE public.sp_test_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  date_test TIMESTAMP WITH TIME ZONE NOT NULL,
  libelle TEXT,
  capacite INTEGER,
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sp_test_sessions TO authenticated;
GRANT ALL ON public.sp_test_sessions TO service_role;
ALTER TABLE public.sp_test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_test_sessions_select_same_ecole" ON public.sp_test_sessions
  FOR SELECT TO authenticated
  USING (ecole_id = (SELECT ecole_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "sp_test_sessions_mutate_admin" ON public.sp_test_sessions
  FOR ALL TO authenticated
  USING (
    ecole_id = (SELECT ecole_id FROM public.profiles WHERE id = auth.uid())
    AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'directeur'::public.app_role) OR private.has_role(auth.uid(),'secretaire'::public.app_role))
  )
  WITH CHECK (
    ecole_id = (SELECT ecole_id FROM public.profiles WHERE id = auth.uid())
    AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'directeur'::public.app_role) OR private.has_role(auth.uid(),'secretaire'::public.app_role))
  );

CREATE TRIGGER trg_sp_test_sessions_updated
  BEFORE UPDATE ON public.sp_test_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sp_touch_updated_at();

CREATE INDEX idx_sp_test_sessions_ecole_date ON public.sp_test_sessions(ecole_id, date_test);

ALTER TABLE public.sp_candidats
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sp_test_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS classe_demandee_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
