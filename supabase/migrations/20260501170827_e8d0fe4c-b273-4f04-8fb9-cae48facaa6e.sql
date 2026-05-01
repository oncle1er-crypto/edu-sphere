
-- 1) Add workflow columns to decisions_fin_annee
ALTER TABLE public.decisions_fin_annee
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'brouillon',
  ADD COLUMN IF NOT EXISTS valide_par UUID,
  ADD COLUMN IF NOT EXISTS valide_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verrouille_par UUID,
  ADD COLUMN IF NOT EXISTS verrouille_le TIMESTAMPTZ;

-- 2) Audit trail table
CREATE TABLE public.audit_decisions_fin_annee (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  decision_id UUID NOT NULL,
  action TEXT NOT NULL,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  effectue_par UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_decisions_fin_annee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.audit_decisions_fin_annee
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.audit_decisions_fin_annee
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE INDEX idx_audit_decision ON public.audit_decisions_fin_annee (decision_id);
CREATE INDEX idx_audit_ecole ON public.audit_decisions_fin_annee (ecole_id);

-- 3) Parcours scolaire table
CREATE TABLE public.parcours_scolaire (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  eleve_id UUID NOT NULL,
  annee_id UUID NOT NULL,
  classe_id UUID NOT NULL,
  decision TEXT,
  classe_destination_id UUID,
  rang INTEGER,
  moyenne_generale NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, eleve_id, annee_id)
);

ALTER TABLE public.parcours_scolaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.parcours_scolaire
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.parcours_scolaire
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE INDEX idx_parcours_eleve ON public.parcours_scolaire (ecole_id, eleve_id);

-- 4) Function to apply locked decisions
CREATE OR REPLACE FUNCTION public.appliquer_decisions_fin_annee(
  _ecole_id UUID,
  _annee_id UUID,
  _user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count_applied INT := 0;
  _count_parcours INT := 0;
  _rec RECORD;
BEGIN
  -- Only process decisions that are verrouillé
  FOR _rec IN
    SELECT d.id, d.eleve_id, d.classe_origine_id, d.decision, d.classe_destination_id
    FROM decisions_fin_annee d
    WHERE d.ecole_id = _ecole_id
      AND d.annee_id = _annee_id
      AND d.statut = 'verrouille'
  LOOP
    -- Insert parcours record
    INSERT INTO parcours_scolaire (ecole_id, eleve_id, annee_id, classe_id, decision, classe_destination_id)
    VALUES (_ecole_id, _rec.eleve_id, _annee_id, _rec.classe_origine_id, _rec.decision, _rec.classe_destination_id)
    ON CONFLICT (ecole_id, eleve_id, annee_id) DO UPDATE
      SET decision = EXCLUDED.decision,
          classe_destination_id = EXCLUDED.classe_destination_id,
          updated_at = now();
    _count_parcours := _count_parcours + 1;

    -- Apply class change for passage & redoublement
    IF _rec.decision IN ('passage', 'transfert') AND _rec.classe_destination_id IS NOT NULL THEN
      UPDATE eleves SET classe_id = _rec.classe_destination_id, updated_at = now()
      WHERE id = _rec.eleve_id AND ecole_id = _ecole_id;
      _count_applied := _count_applied + 1;
    ELSIF _rec.decision = 'redoublement' THEN
      -- Keep same class, just update status
      UPDATE eleves SET updated_at = now()
      WHERE id = _rec.eleve_id AND ecole_id = _ecole_id;
      _count_applied := _count_applied + 1;
    ELSIF _rec.decision = 'exclusion' THEN
      UPDATE eleves SET statut = 'exclu', updated_at = now()
      WHERE id = _rec.eleve_id AND ecole_id = _ecole_id;
      _count_applied := _count_applied + 1;
    END IF;

    -- Audit
    INSERT INTO audit_decisions_fin_annee (ecole_id, decision_id, action, ancien_statut, nouveau_statut, effectue_par, details)
    VALUES (_ecole_id, _rec.id, 'application', 'verrouille', 'applique', _user_id,
      jsonb_build_object('decision', _rec.decision, 'eleve_id', _rec.eleve_id, 'classe_destination_id', _rec.classe_destination_id));
  END LOOP;

  -- Mark decisions as applied
  UPDATE decisions_fin_annee SET statut = 'applique', updated_at = now()
  WHERE ecole_id = _ecole_id AND annee_id = _annee_id AND statut = 'verrouille';

  RETURN jsonb_build_object('parcours', _count_parcours, 'affectations', _count_applied);
END;
$$;
