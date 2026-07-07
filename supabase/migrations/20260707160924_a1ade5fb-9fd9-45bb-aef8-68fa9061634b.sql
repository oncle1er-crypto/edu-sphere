
-- Module Cours de vacances : tables isolées, aucune modification des tables existantes

-- 1. Classes
CREATE TABLE public.vacances_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id UUID REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  capacite INTEGER CHECK (capacite IS NULL OR capacite > 0),
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vac_classes_ecole ON public.vacances_classes(ecole_id, annee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacances_classes TO authenticated;
GRANT ALL ON public.vacances_classes TO service_role;
ALTER TABLE public.vacances_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vac_classes_read" ON public.vacances_classes FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "vac_classes_write" ON public.vacances_classes FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- 2. Élèves
CREATE TABLE public.vacances_eleves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id UUID REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  classe_id UUID NOT NULL REFERENCES public.vacances_classes(id) ON DELETE RESTRICT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe TEXT CHECK (sexe IN ('M','F') OR sexe IS NULL),
  date_naissance DATE,
  contact_parent TEXT,
  etablissement_origine TEXT,
  observation TEXT,
  date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
  statut_paiement TEXT NOT NULL DEFAULT 'non_paye' CHECK (statut_paiement IN ('paye','non_paye','partiel')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vac_eleves_ecole ON public.vacances_eleves(ecole_id, annee_id);
CREATE INDEX ix_vac_eleves_classe ON public.vacances_eleves(classe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacances_eleves TO authenticated;
GRANT ALL ON public.vacances_eleves TO service_role;
ALTER TABLE public.vacances_eleves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vac_eleves_read" ON public.vacances_eleves FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "vac_eleves_write" ON public.vacances_eleves FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- 3. Paiements élèves
CREATE TABLE public.vacances_paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.vacances_eleves(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES public.vacances_classes(id) ON DELETE RESTRICT,
  montant_attendu NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL DEFAULT 'especes' CHECK (mode IN ('especes','mobile_money','virement','autre')),
  statut TEXT NOT NULL DEFAULT 'paye' CHECK (statut IN ('paye','non_paye','partiel')),
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vac_paie_ecole ON public.vacances_paiements(ecole_id);
CREATE INDEX ix_vac_paie_eleve ON public.vacances_paiements(eleve_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacances_paiements TO authenticated;
GRANT ALL ON public.vacances_paiements TO service_role;
ALTER TABLE public.vacances_paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vac_paie_read" ON public.vacances_paiements FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "vac_paie_write" ON public.vacances_paiements FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- Trigger : recalcule statut_paiement de l'élève
CREATE OR REPLACE FUNCTION public.tg_vacances_recalc_statut_eleve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_eleve_id UUID; v_total NUMERIC; v_attendu NUMERIC;
BEGIN
  v_eleve_id := COALESCE(NEW.eleve_id, OLD.eleve_id);
  SELECT COALESCE(SUM(montant_paye),0) INTO v_total FROM public.vacances_paiements WHERE eleve_id = v_eleve_id;
  SELECT c.montant INTO v_attendu FROM public.vacances_eleves e JOIN public.vacances_classes c ON c.id = e.classe_id WHERE e.id = v_eleve_id;
  UPDATE public.vacances_eleves SET
    statut_paiement = CASE
      WHEN v_total <= 0 THEN 'non_paye'
      WHEN v_total >= COALESCE(v_attendu,0) THEN 'paye'
      ELSE 'partiel'
    END,
    updated_at = now()
  WHERE id = v_eleve_id;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_vac_paie_statut
AFTER INSERT OR UPDATE OR DELETE ON public.vacances_paiements
FOR EACH ROW EXECUTE FUNCTION public.tg_vacances_recalc_statut_eleve();

-- 4. Enseignants (maîtres)
CREATE TABLE public.vacances_enseignants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id UUID REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  classe_id UUID REFERENCES public.vacances_classes(id) ON DELETE SET NULL,
  matiere TEXT,
  honoraire_prevu NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (honoraire_prevu >= 0),
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vac_ens_ecole ON public.vacances_enseignants(ecole_id, annee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacances_enseignants TO authenticated;
GRANT ALL ON public.vacances_enseignants TO service_role;
ALTER TABLE public.vacances_enseignants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vac_ens_read" ON public.vacances_enseignants FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "vac_ens_write" ON public.vacances_enseignants FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- 5. Honoraires
CREATE TABLE public.vacances_honoraires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES public.vacances_enseignants(id) ON DELETE CASCADE,
  montant NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL DEFAULT 'especes' CHECK (mode IN ('especes','mobile_money','virement','autre')),
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vac_hon_ecole ON public.vacances_honoraires(ecole_id);
CREATE INDEX ix_vac_hon_ens ON public.vacances_honoraires(enseignant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacances_honoraires TO authenticated;
GRANT ALL ON public.vacances_honoraires TO service_role;
ALTER TABLE public.vacances_honoraires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vac_hon_read" ON public.vacances_honoraires FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "vac_hon_write" ON public.vacances_honoraires FOR ALL TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
  );

-- Triggers updated_at
CREATE TRIGGER trg_vac_classes_upd BEFORE UPDATE ON public.vacances_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_vac_eleves_upd BEFORE UPDATE ON public.vacances_eleves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_vac_paie_upd BEFORE UPDATE ON public.vacances_paiements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_vac_ens_upd BEFORE UPDATE ON public.vacances_enseignants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_vac_hon_upd BEFORE UPDATE ON public.vacances_honoraires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Module dans le registre app_modules pour matrice de permissions
INSERT INTO public.app_modules(key, label, icon, ordre) VALUES
  ('cours_vacances', 'Cours de vacances', 'Sun', 155)
ON CONFLICT (key) DO NOTHING;
