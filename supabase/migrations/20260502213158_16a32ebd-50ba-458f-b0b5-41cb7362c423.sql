
-- Table des incidents disciplinaires
CREATE TABLE public.incidents_discipline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  classe_id uuid,
  annee_id uuid,
  date_incident date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'avertissement',
  motif text,
  decision text,
  gravite text DEFAULT 'leger',
  enregistre_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents_discipline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.incidents_discipline
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.incidents_discipline
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'enseignant') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'enseignant') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'));

CREATE TRIGGER update_incidents_discipline_updated_at
  BEFORE UPDATE ON public.incidents_discipline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table des visites infirmerie
CREATE TABLE public.visites_infirmerie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  classe_id uuid,
  date_visite date NOT NULL DEFAULT CURRENT_DATE,
  motif text NOT NULL,
  traitement text,
  suivi text,
  enregistre_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visites_infirmerie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.visites_infirmerie
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.visites_infirmerie
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE TRIGGER update_visites_infirmerie_updated_at
  BEFORE UPDATE ON public.visites_infirmerie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table menus cantine
CREATE TABLE public.menus_cantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  date_menu date NOT NULL,
  repas text NOT NULL DEFAULT 'dejeuner',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menus_cantine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.menus_cantine
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.menus_cantine
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE TRIGGER update_menus_cantine_updated_at
  BEFORE UPDATE ON public.menus_cantine
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table stocks cantine
CREATE TABLE public.stocks_cantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  produit text NOT NULL,
  quantite numeric NOT NULL DEFAULT 0,
  unite text DEFAULT 'kg',
  seuil_alerte numeric DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stocks_cantine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.stocks_cantine
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.stocks_cantine
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE TRIGGER update_stocks_cantine_updated_at
  BEFORE UPDATE ON public.stocks_cantine
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table annonces / communication
CREATE TABLE public.annonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  titre text NOT NULL,
  contenu text,
  audience text DEFAULT 'tous',
  publie boolean DEFAULT false,
  publie_le timestamptz,
  auteur_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.annonces
  FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.annonces
  FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur'));

CREATE TRIGGER update_annonces_updated_at
  BEFORE UPDATE ON public.annonces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table messages internes
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  expediteur_id uuid NOT NULL,
  destinataire_id uuid,
  sujet text NOT NULL,
  contenu text,
  lu boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_messages_read" ON public.messages
  FOR SELECT TO authenticated
  USING (expediteur_id = auth.uid() OR destinataire_id = auth.uid());

CREATE POLICY "own_messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (expediteur_id = auth.uid() AND user_belongs_to_ecole(auth.uid(), ecole_id));
