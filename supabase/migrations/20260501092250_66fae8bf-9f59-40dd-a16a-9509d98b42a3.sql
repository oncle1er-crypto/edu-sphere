
-- =============================================
-- PHASE 2: SCHÉMA DB COMPLET MULTI-TENANT GSP
-- =============================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'directeur', 'comptable', 'enseignant', 'surveillant', 'parent');
CREATE TYPE public.ecole_status AS ENUM ('active', 'suspendue', 'archivee');
CREATE TYPE public.annee_statut AS ENUM ('active', 'preparation', 'verrouillee', 'archivee');
CREATE TYPE public.periode_statut AS ENUM ('a_venir', 'en_cours', 'verrouillee');
CREATE TYPE public.decoupage_type AS ENUM ('trimestre', 'semestre');
CREATE TYPE public.sexe_type AS ENUM ('M', 'F');
CREATE TYPE public.tranche_statut AS ENUM ('payee', 'partielle', 'due', 'retard');
CREATE TYPE public.paiement_mode AS ENUM ('especes', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'virement', 'cheque');
CREATE TYPE public.relance_type AS ENUM ('sms', 'email', 'appel', 'courrier');
CREATE TYPE public.presence_statut AS ENUM ('present', 'absent', 'retard', 'excuse');
CREATE TYPE public.carte_type AS ENUM ('eleve', 'enseignant', 'personnel');
CREATE TYPE public.carte_statut AS ENUM ('active', 'perdue', 'expiree', 'annulee');

-- 2. ECOLES (table racine multi-tenant)
CREATE TABLE public.ecoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  ville TEXT NOT NULL DEFAULT 'Abidjan',
  pays TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  directeur TEXT,
  type TEXT NOT NULL DEFAULT 'Groupe scolaire',
  status public.ecole_status NOT NULL DEFAULT 'active',
  logo_url TEXT,
  devise TEXT DEFAULT 'Foi, Savoir, Excellence',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecoles ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ecole_id UUID REFERENCES public.ecoles(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. USER ROLES (separate table per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ecole_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_ecole_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ecole_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_ecole_role(_user_id UUID, _ecole_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND ecole_id = _ecole_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_ecole(_user_id UUID, _ecole_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND ecole_id = _ecole_id
  )
$$;

-- 6. ANNEES SCOLAIRES
CREATE TABLE public.annees_scolaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  debut DATE NOT NULL,
  fin DATE NOT NULL,
  decoupage public.decoupage_type NOT NULL DEFAULT 'trimestre',
  statut public.annee_statut NOT NULL DEFAULT 'preparation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, libelle)
);
ALTER TABLE public.annees_scolaires ENABLE ROW LEVEL SECURITY;

-- 7. PERIODES
CREATE TABLE public.periodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annee_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  debut DATE NOT NULL,
  fin DATE NOT NULL,
  statut public.periode_statut NOT NULL DEFAULT 'a_venir',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.periodes ENABLE ROW LEVEL SECURITY;

-- 8. CYCLES
CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL, -- Maternelle, Primaire, Collège, Lycée
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, nom)
);
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

-- 9. CLASSES
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  annee_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  capacite INT DEFAULT 50,
  salle TEXT,
  professeur_principal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 10. ELEVES
CREATE TABLE public.eleves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  matricule TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe public.sexe_type,
  date_naissance DATE,
  lieu_naissance TEXT,
  nationalite TEXT DEFAULT 'Ivoirienne',
  adresse TEXT,
  photo_url TEXT,
  classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  annee_id UUID REFERENCES public.annees_scolaires(id),
  statut TEXT NOT NULL DEFAULT 'inscrit',
  date_inscription DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, matricule)
);
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;

-- 11. PARENTS
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  telephone2 TEXT,
  email TEXT,
  profession TEXT,
  adresse TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- 12. ELEVE_PARENTS (junction)
CREATE TABLE public.eleve_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  lien TEXT NOT NULL DEFAULT 'père', -- père, mère, tuteur, tutrice
  est_contact_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(eleve_id, parent_id)
);
ALTER TABLE public.eleve_parents ENABLE ROW LEVEL SECURITY;

-- 13. ENSEIGNANTS
CREATE TABLE public.enseignants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matricule TEXT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe public.sexe_type,
  telephone TEXT,
  email TEXT,
  specialite TEXT,
  diplome TEXT,
  date_embauche DATE,
  type_contrat TEXT DEFAULT 'CDI',
  statut TEXT NOT NULL DEFAULT 'actif',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, matricule)
);
ALTER TABLE public.enseignants ENABLE ROW LEVEL SECURITY;

-- 14. MATIERES
CREATE TABLE public.matieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  code TEXT,
  categorie TEXT, -- Scientifique, Littéraire, Artistique...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, nom)
);
ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;

-- 15. CLASSE_MATIERES (junction)
CREATE TABLE public.classe_matieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  matiere_id UUID NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  coefficient NUMERIC(3,1) NOT NULL DEFAULT 1,
  volume_horaire_hebdo NUMERIC(4,1) DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classe_id, matiere_id)
);
ALTER TABLE public.classe_matieres ENABLE ROW LEVEL SECURITY;

-- 16. ENSEIGNANT_MATIERES (junction)
CREATE TABLE public.enseignant_matieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  matiere_id UUID NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id UUID REFERENCES public.annees_scolaires(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enseignant_id, matiere_id, classe_id)
);
ALTER TABLE public.enseignant_matieres ENABLE ROW LEVEL SECURITY;

-- 17. FRAIS SCOLARITE (grille tarifaire)
CREATE TABLE public.frais_scolarite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL DEFAULT 'Scolarité',
  montant_annuel NUMERIC(12,0) NOT NULL,
  nb_tranches INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, annee_id, cycle_id, libelle)
);
ALTER TABLE public.frais_scolarite ENABLE ROW LEVEL SECURITY;

-- 18. TRANCHES (échéancier par élève)
CREATE TABLE public.tranches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  frais_id UUID NOT NULL REFERENCES public.frais_scolarite(id) ON DELETE CASCADE,
  numero INT NOT NULL, -- 1, 2, 3
  label TEXT NOT NULL,
  echeance DATE NOT NULL,
  montant NUMERIC(12,0) NOT NULL,
  paye NUMERIC(12,0) NOT NULL DEFAULT 0,
  statut public.tranche_statut NOT NULL DEFAULT 'due',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tranches ENABLE ROW LEVEL SECURITY;

-- 19. PAIEMENTS
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  tranche_id UUID REFERENCES public.tranches(id) ON DELETE SET NULL,
  montant NUMERIC(12,0) NOT NULL,
  mode public.paiement_mode NOT NULL DEFAULT 'especes',
  reference TEXT,
  recu_par UUID REFERENCES auth.users(id),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- 20. RELANCES
CREATE TABLE public.relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  type public.relance_type NOT NULL DEFAULT 'sms',
  message TEXT,
  envoye_par UUID REFERENCES auth.users(id),
  date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relances ENABLE ROW LEVEL SECURITY;

-- 21. EVALUATIONS
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  matiere_id UUID NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
  periode_id UUID REFERENCES public.periodes(id) ON DELETE SET NULL,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE SET NULL,
  titre TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'devoir', -- devoir, interrogation, composition, examen
  date_eval DATE NOT NULL,
  bareme NUMERIC(5,2) NOT NULL DEFAULT 20,
  coefficient NUMERIC(3,1) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- 22. NOTES
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  note NUMERIC(5,2),
  absent BOOLEAN DEFAULT false,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, eleve_id)
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 23. PRESENCES
CREATE TABLE public.presences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date_presence DATE NOT NULL,
  statut public.presence_statut NOT NULL DEFAULT 'present',
  heure_arrivee TIME,
  motif_absence TEXT,
  justifie BOOLEAN DEFAULT false,
  enregistre_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(eleve_id, date_presence)
);
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

-- 24. LIVRES (bibliothèque)
CREATE TABLE public.livres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  auteur TEXT,
  isbn TEXT,
  categorie TEXT,
  editeur TEXT,
  quantite INT NOT NULL DEFAULT 1,
  disponible INT NOT NULL DEFAULT 1,
  emplacement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livres ENABLE ROW LEVEL SECURITY;

-- 25. EMPRUNTS
CREATE TABLE public.emprunts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  livre_id UUID NOT NULL REFERENCES public.livres(id) ON DELETE CASCADE,
  eleve_id UUID REFERENCES public.eleves(id) ON DELETE SET NULL,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE SET NULL,
  date_emprunt DATE NOT NULL DEFAULT CURRENT_DATE,
  date_retour_prevue DATE NOT NULL,
  date_retour_effective DATE,
  statut TEXT NOT NULL DEFAULT 'en_cours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emprunts ENABLE ROW LEVEL SECURITY;

-- 26. ABONNEMENTS CANTINE
CREATE TABLE public.abonnements_cantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  annee_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  regime TEXT DEFAULT 'normal', -- normal, sans_porc, vegetarien, allergie
  statut TEXT NOT NULL DEFAULT 'actif',
  montant_mensuel NUMERIC(10,0) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, eleve_id, annee_id)
);
ALTER TABLE public.abonnements_cantine ENABLE ROW LEVEL SECURITY;

-- 27. VEHICULES
CREATE TABLE public.vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  immatriculation TEXT NOT NULL,
  marque TEXT,
  modele TEXT,
  capacite INT DEFAULT 30,
  chauffeur TEXT,
  telephone_chauffeur TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

-- 28. LIGNES TRANSPORT
CREATE TABLE public.lignes_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  depart TEXT NOT NULL,
  arrivee TEXT NOT NULL,
  vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE SET NULL,
  heure_depart TIME,
  heure_arrivee TIME,
  tarif_mensuel NUMERIC(10,0) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lignes_transport ENABLE ROW LEVEL SECURITY;

-- 29. ABONNEMENTS TRANSPORT
CREATE TABLE public.abonnements_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  ligne_id UUID NOT NULL REFERENCES public.lignes_transport(id) ON DELETE CASCADE,
  annee_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, eleve_id, annee_id)
);
ALTER TABLE public.abonnements_transport ENABLE ROW LEVEL SECURITY;

-- 30. CARTES
CREATE TABLE public.cartes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  type public.carte_type NOT NULL DEFAULT 'eleve',
  eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  annee_id UUID REFERENCES public.annees_scolaires(id),
  date_emission DATE DEFAULT CURRENT_DATE,
  date_expiration DATE,
  statut public.carte_statut NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, numero)
);
ALTER TABLE public.cartes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_profiles_ecole ON public.profiles(ecole_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_ecole ON public.user_roles(ecole_id);
CREATE INDEX idx_annees_ecole ON public.annees_scolaires(ecole_id);
CREATE INDEX idx_periodes_annee ON public.periodes(annee_id);
CREATE INDEX idx_periodes_ecole ON public.periodes(ecole_id);
CREATE INDEX idx_classes_ecole ON public.classes(ecole_id);
CREATE INDEX idx_classes_cycle ON public.classes(cycle_id);
CREATE INDEX idx_eleves_ecole ON public.eleves(ecole_id);
CREATE INDEX idx_eleves_classe ON public.eleves(classe_id);
CREATE INDEX idx_eleves_matricule ON public.eleves(matricule);
CREATE INDEX idx_parents_ecole ON public.parents(ecole_id);
CREATE INDEX idx_enseignants_ecole ON public.enseignants(ecole_id);
CREATE INDEX idx_matieres_ecole ON public.matieres(ecole_id);
CREATE INDEX idx_tranches_eleve ON public.tranches(eleve_id);
CREATE INDEX idx_tranches_ecole ON public.tranches(ecole_id);
CREATE INDEX idx_paiements_eleve ON public.paiements(eleve_id);
CREATE INDEX idx_paiements_ecole ON public.paiements(ecole_id);
CREATE INDEX idx_evaluations_ecole ON public.evaluations(ecole_id);
CREATE INDEX idx_evaluations_classe ON public.evaluations(classe_id);
CREATE INDEX idx_notes_ecole ON public.notes(ecole_id);
CREATE INDEX idx_notes_eleve ON public.notes(eleve_id);
CREATE INDEX idx_presences_ecole ON public.presences(ecole_id);
CREATE INDEX idx_presences_eleve ON public.presences(eleve_id);
CREATE INDEX idx_presences_date ON public.presences(date_presence);

-- =============================================
-- TRIGGER: auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER: updated_at auto-refresh
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ecoles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.annees_scolaires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.eleves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.enseignants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.frais_scolarite FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tranches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.livres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.abonnements_cantine FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cartes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper: all data tables use ecole_id isolation
-- Pattern: authenticated users see only their ecole's data

-- ECOLES: users see ecoles they belong to
CREATE POLICY "Users see their ecoles" ON public.ecoles
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_ecole(auth.uid(), id));

CREATE POLICY "Admins manage ecoles" ON public.ecoles
  FOR ALL TO authenticated
  USING (public.has_ecole_role(auth.uid(), id, 'admin'))
  WITH CHECK (public.has_ecole_role(auth.uid(), id, 'admin'));

-- PROFILES
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Profile auto-insert on signup" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- USER_ROLES
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin'))
  WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin'));

-- MACRO: ecole-scoped read for authenticated
-- Applied to all data tables below

CREATE POLICY "ecole_read" ON public.annees_scolaires FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.annees_scolaires FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.periodes FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.periodes FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.cycles FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.cycles FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.classes FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.classes FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.eleves FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.eleves FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.parents FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.parents FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.eleve_parents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.eleves e WHERE e.id = eleve_id AND public.user_belongs_to_ecole(auth.uid(), e.ecole_id)));
CREATE POLICY "ecole_write" ON public.eleve_parents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.eleves e WHERE e.id = eleve_id AND (public.has_ecole_role(auth.uid(), e.ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), e.ecole_id, 'directeur')))) WITH CHECK (EXISTS (SELECT 1 FROM public.eleves e WHERE e.id = eleve_id AND (public.has_ecole_role(auth.uid(), e.ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), e.ecole_id, 'directeur'))));

CREATE POLICY "ecole_read" ON public.enseignants FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.enseignants FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.matieres FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.matieres FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.classe_matieres FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.classe_matieres FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.enseignant_matieres FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.enseignant_matieres FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.frais_scolarite FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.frais_scolarite FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

CREATE POLICY "ecole_read" ON public.tranches FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.tranches FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

CREATE POLICY "ecole_read" ON public.paiements FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.paiements FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

CREATE POLICY "ecole_read" ON public.relances FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.relances FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

CREATE POLICY "ecole_read" ON public.evaluations FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.evaluations FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur') OR public.has_ecole_role(auth.uid(), ecole_id, 'enseignant')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur') OR public.has_ecole_role(auth.uid(), ecole_id, 'enseignant'));

CREATE POLICY "ecole_read" ON public.notes FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.notes FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur') OR public.has_ecole_role(auth.uid(), ecole_id, 'enseignant')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur') OR public.has_ecole_role(auth.uid(), ecole_id, 'enseignant'));

CREATE POLICY "ecole_read" ON public.presences FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.presences FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'surveillant') OR public.has_ecole_role(auth.uid(), ecole_id, 'enseignant')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'surveillant') OR public.has_ecole_role(auth.uid(), ecole_id, 'enseignant'));

CREATE POLICY "ecole_read" ON public.livres FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.livres FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.emprunts FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.emprunts FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.abonnements_cantine FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.abonnements_cantine FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.vehicules FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.vehicules FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.lignes_transport FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.lignes_transport FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.abonnements_transport FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.abonnements_transport FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE POLICY "ecole_read" ON public.cartes FOR SELECT TO authenticated USING (public.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.cartes FOR ALL TO authenticated USING (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur')) WITH CHECK (public.has_ecole_role(auth.uid(), ecole_id, 'admin') OR public.has_ecole_role(auth.uid(), ecole_id, 'directeur'));
