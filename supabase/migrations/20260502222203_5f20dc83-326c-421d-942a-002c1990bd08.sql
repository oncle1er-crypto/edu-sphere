
-- ===== FOURNISSEURS =====
CREATE TABLE public.fournisseurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  nom TEXT NOT NULL,
  categorie TEXT,
  contact TEXT,
  email TEXT,
  adresse TEXT,
  solde_du NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.fournisseurs FOR SELECT TO authenticated USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.fournisseurs FOR ALL TO authenticated USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));
CREATE TRIGGER update_fournisseurs_updated_at BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== DEPENSES =====
CREATE TABLE public.depenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  reference TEXT,
  libelle TEXT NOT NULL,
  categorie TEXT,
  montant NUMERIC NOT NULL,
  fournisseur_id UUID REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  notes TEXT,
  enregistre_par UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.depenses FOR SELECT TO authenticated USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.depenses FOR ALL TO authenticated USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));
CREATE TRIGGER update_depenses_updated_at BEFORE UPDATE ON public.depenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== COMPTES TRESORERIE =====
CREATE TABLE public.comptes_tresorerie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  nom TEXT NOT NULL,
  numero TEXT,
  type TEXT NOT NULL DEFAULT 'banque',
  solde NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comptes_tresorerie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.comptes_tresorerie FOR SELECT TO authenticated USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.comptes_tresorerie FOR ALL TO authenticated USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));
CREATE TRIGGER update_comptes_tresorerie_updated_at BEFORE UPDATE ON public.comptes_tresorerie FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== MOUVEMENTS TRESORERIE =====
CREATE TABLE public.mouvements_tresorerie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  compte_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  montant NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'entree',
  date_mouvement DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mouvements_tresorerie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.mouvements_tresorerie FOR SELECT TO authenticated USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.mouvements_tresorerie FOR ALL TO authenticated USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));

-- ===== LIGNES BUDGET =====
CREATE TABLE public.lignes_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  annee_id UUID NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'depense',
  montant_prevu NUMERIC NOT NULL DEFAULT 0,
  montant_realise NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lignes_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.lignes_budget FOR SELECT TO authenticated USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.lignes_budget FOR ALL TO authenticated USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));
CREATE TRIGGER update_lignes_budget_updated_at BEFORE UPDATE ON public.lignes_budget FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== BULLETINS DE PAIE =====
CREATE TABLE public.bulletins_paie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL,
  enseignant_id UUID NOT NULL,
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  salaire_brut NUMERIC NOT NULL DEFAULT 0,
  retenues NUMERIC NOT NULL DEFAULT 0,
  net_a_payer NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date_paiement DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ecole_id, enseignant_id, mois, annee)
);
ALTER TABLE public.bulletins_paie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.bulletins_paie FOR SELECT TO authenticated USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.bulletins_paie FOR ALL TO authenticated USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable')) WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'comptable'));
CREATE TRIGGER update_bulletins_paie_updated_at BEFORE UPDATE ON public.bulletins_paie FOR EACH ROW EXECUTE FUNCTION update_updated_at();
