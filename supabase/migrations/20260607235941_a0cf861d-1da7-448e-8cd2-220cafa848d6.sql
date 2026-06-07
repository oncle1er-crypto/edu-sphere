
-- ============================================================
-- CANTINE
-- ============================================================

CREATE TABLE public.cantine_regimes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id uuid REFERENCES public.eleves(id) ON DELETE CASCADE,
  type_regime text NOT NULL,
  allergenes text[] DEFAULT '{}',
  restrictions text,
  certificat_medical_url text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantine_regimes TO authenticated;
GRANT ALL ON public.cantine_regimes TO service_role;
ALTER TABLE public.cantine_regimes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cantine_regimes_ecole" ON public.cantine_regimes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_regimes.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_regimes.ecole_id));

CREATE TABLE public.cantine_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  date_incident date NOT NULL DEFAULT CURRENT_DATE,
  type_incident text NOT NULL,
  gravite text NOT NULL DEFAULT 'faible',
  description text NOT NULL,
  eleve_id uuid REFERENCES public.eleves(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'ouvert',
  actions_prises text,
  signale_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantine_incidents TO authenticated;
GRANT ALL ON public.cantine_incidents TO service_role;
ALTER TABLE public.cantine_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cantine_incidents_ecole" ON public.cantine_incidents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_incidents.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_incidents.ecole_id));

CREATE TABLE public.cantine_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  date_service date NOT NULL,
  service text NOT NULL DEFAULT 'dejeuner',
  capacite_prevue int,
  effectif_inscrits int DEFAULT 0,
  effectif_realise int,
  menu_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, date_service, service)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantine_planning TO authenticated;
GRANT ALL ON public.cantine_planning TO service_role;
ALTER TABLE public.cantine_planning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cantine_planning_ecole" ON public.cantine_planning FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_planning.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_planning.ecole_id));

CREATE TABLE public.cantine_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text NOT NULL,
  fonction text NOT NULL,
  telephone text,
  email text,
  date_embauche date,
  certifications text[] DEFAULT '{}',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantine_personnel TO authenticated;
GRANT ALL ON public.cantine_personnel TO service_role;
ALTER TABLE public.cantine_personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cantine_personnel_ecole" ON public.cantine_personnel FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_personnel.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = cantine_personnel.ecole_id));

-- ============================================================
-- ENSEIGNANTS RH
-- ============================================================

CREATE TABLE public.enseignants_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  enseignant_id uuid NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  annee_id uuid REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  date_evaluation date NOT NULL DEFAULT CURRENT_DATE,
  note_globale numeric(4,2),
  pedagogie int,
  ponctualite int,
  relation_eleves int,
  participation int,
  points_forts text,
  axes_amelioration text,
  objectifs text,
  evaluateur_id uuid,
  statut text NOT NULL DEFAULT 'brouillon',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enseignants_evaluations TO authenticated;
GRANT ALL ON public.enseignants_evaluations TO service_role;
ALTER TABLE public.enseignants_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enseignants_evaluations_ecole" ON public.enseignants_evaluations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_evaluations.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_evaluations.ecole_id));

CREATE TABLE public.enseignants_candidatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text,
  telephone text,
  matiere_souhaitee text,
  niveau_etudes text,
  experience_annees int,
  cv_url text,
  lettre_motivation_url text,
  date_candidature date NOT NULL DEFAULT CURRENT_DATE,
  statut text NOT NULL DEFAULT 'recue',
  notes_entretien text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enseignants_candidatures TO authenticated;
GRANT ALL ON public.enseignants_candidatures TO service_role;
ALTER TABLE public.enseignants_candidatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enseignants_candidatures_ecole" ON public.enseignants_candidatures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_candidatures.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_candidatures.ecole_id));

CREATE TABLE public.enseignants_formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  enseignant_id uuid NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  intitule text NOT NULL,
  organisme text,
  date_debut date,
  date_fin date,
  duree_heures int,
  lieu text,
  certificat_url text,
  statut text NOT NULL DEFAULT 'planifiee',
  cout numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enseignants_formations TO authenticated;
GRANT ALL ON public.enseignants_formations TO service_role;
ALTER TABLE public.enseignants_formations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enseignants_formations_ecole" ON public.enseignants_formations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_formations.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_formations.ecole_id));

CREATE TABLE public.enseignants_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  enseignant_id uuid NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  type_document text NOT NULL,
  libelle text,
  url_fichier text NOT NULL,
  date_emission date,
  date_expiration date,
  valide boolean DEFAULT true,
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enseignants_documents TO authenticated;
GRANT ALL ON public.enseignants_documents TO service_role;
ALTER TABLE public.enseignants_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enseignants_documents_ecole" ON public.enseignants_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_documents.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = enseignants_documents.ecole_id));

-- ============================================================
-- EXAMENS
-- ============================================================

CREATE TABLE public.sessions_compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id uuid REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  periode_id uuid,
  libelle text NOT NULL,
  type_session text NOT NULL DEFAULT 'composition',
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  statut text NOT NULL DEFAULT 'planifiee',
  consignes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions_compositions TO authenticated;
GRANT ALL ON public.sessions_compositions TO service_role;
ALTER TABLE public.sessions_compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_compositions_ecole" ON public.sessions_compositions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = sessions_compositions.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = sessions_compositions.ecole_id));

CREATE TABLE public.conseils_classe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id uuid REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  periode_id uuid,
  classe_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date_conseil date NOT NULL,
  heure_debut time,
  president_id uuid,
  participants jsonb DEFAULT '[]'::jsonb,
  ordre_du_jour text,
  proces_verbal text,
  statut text NOT NULL DEFAULT 'planifie',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conseils_classe TO authenticated;
GRANT ALL ON public.conseils_classe TO service_role;
ALTER TABLE public.conseils_classe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conseils_classe_ecole" ON public.conseils_classe FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = conseils_classe.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = conseils_classe.ecole_id));

-- ============================================================
-- BIBLIOTHEQUE
-- ============================================================

CREATE TABLE public.bibliotheque_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  couleur text,
  ordre int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, nom)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bibliotheque_categories TO authenticated;
GRANT ALL ON public.bibliotheque_categories TO service_role;
ALTER TABLE public.bibliotheque_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bibliotheque_categories_ecole" ON public.bibliotheque_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = bibliotheque_categories.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = bibliotheque_categories.ecole_id));

CREATE TABLE public.bibliotheque_acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  titre text NOT NULL,
  auteur text,
  isbn text,
  editeur text,
  quantite int NOT NULL DEFAULT 1,
  prix_unitaire numeric(12,2),
  fournisseur text,
  date_commande date NOT NULL DEFAULT CURRENT_DATE,
  date_reception date,
  statut text NOT NULL DEFAULT 'commande',
  notes text,
  demande_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bibliotheque_acquisitions TO authenticated;
GRANT ALL ON public.bibliotheque_acquisitions TO service_role;
ALTER TABLE public.bibliotheque_acquisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bibliotheque_acquisitions_ecole" ON public.bibliotheque_acquisitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = bibliotheque_acquisitions.ecole_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = bibliotheque_acquisitions.ecole_id));

-- ============================================================
-- Triggers updated_at
-- ============================================================

CREATE TRIGGER trg_cantine_regimes_updated BEFORE UPDATE ON public.cantine_regimes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_cantine_incidents_updated BEFORE UPDATE ON public.cantine_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_cantine_planning_updated BEFORE UPDATE ON public.cantine_planning
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_cantine_personnel_updated BEFORE UPDATE ON public.cantine_personnel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_enseignants_evaluations_updated BEFORE UPDATE ON public.enseignants_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_enseignants_candidatures_updated BEFORE UPDATE ON public.enseignants_candidatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_enseignants_formations_updated BEFORE UPDATE ON public.enseignants_formations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_enseignants_documents_updated BEFORE UPDATE ON public.enseignants_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sessions_compositions_updated BEFORE UPDATE ON public.sessions_compositions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_conseils_classe_updated BEFORE UPDATE ON public.conseils_classe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_bibliotheque_categories_updated BEFORE UPDATE ON public.bibliotheque_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_bibliotheque_acquisitions_updated BEFORE UPDATE ON public.bibliotheque_acquisitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
