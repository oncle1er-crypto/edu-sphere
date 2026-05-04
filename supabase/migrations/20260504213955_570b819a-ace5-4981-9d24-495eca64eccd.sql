
-- Table factures
CREATE TABLE public.factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  annee_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  numero text NOT NULL,
  libelle text NOT NULL DEFAULT 'Frais de scolarité',
  montant numeric NOT NULL DEFAULT 0,
  montant_paye numeric NOT NULL DEFAULT 0,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  date_echeance date NOT NULL,
  statut text NOT NULL DEFAULT 'brouillon',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_factures_ecole ON public.factures(ecole_id);
CREATE INDEX idx_factures_eleve ON public.factures(eleve_id);
CREATE INDEX idx_factures_statut ON public.factures(statut);
CREATE UNIQUE INDEX idx_factures_numero_ecole ON public.factures(ecole_id, numero);

-- RLS
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.factures
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.factures
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));

-- Trigger updated_at
CREATE TRIGGER update_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
