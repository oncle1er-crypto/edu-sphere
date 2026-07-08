CREATE TABLE public.report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,
  label text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX report_jobs_user_status_idx ON public.report_jobs(user_id, status, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_jobs TO authenticated;
GRANT ALL ON public.report_jobs TO service_role;

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own report jobs"
ON public.report_jobs FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());