
-- Table to track student year-end decisions (promotion, retention, transfer)
CREATE TABLE public.decisions_fin_annee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  annee_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  classe_origine_id uuid NOT NULL,
  decision text NOT NULL DEFAULT 'passage', -- passage, redoublement, exclusion, transfert
  classe_destination_id uuid,
  motif text,
  decide_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, annee_id, eleve_id)
);

ALTER TABLE public.decisions_fin_annee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.decisions_fin_annee
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.decisions_fin_annee
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.decisions_fin_annee
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
