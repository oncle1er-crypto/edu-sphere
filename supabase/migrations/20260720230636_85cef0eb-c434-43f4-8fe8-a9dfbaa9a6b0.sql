
-- Enums
DO $$ BEGIN CREATE TYPE public.sp_candidat_statut AS ENUM ('en_attente','programme','absent','present','admis','refuse'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sp_vente_statut AS ENUM ('paye','remis','attente','annule'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sp_mode_paiement AS ENUM ('especes','wave','orange_money','mtn_money','moov_money','virement','cheque'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sp_beneficiaire_type AS ENUM ('eleve','candidat','libre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.sp_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- sp_services
CREATE TABLE public.sp_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  slug text NOT NULL,
  nom text NOT NULL,
  description text,
  prix numeric NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  accepte_partiel boolean NOT NULL DEFAULT false,
  gere_stock boolean NOT NULL DEFAULT false,
  couleur text NOT NULL DEFAULT '#6E1A2C',
  icone text NOT NULL DEFAULT 'Ticket',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sp_services TO authenticated;
GRANT ALL ON public.sp_services TO service_role;
ALTER TABLE public.sp_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_services_read" ON public.sp_services FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "sp_services_write" ON public.sp_services FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));
CREATE TRIGGER trg_sp_services_touch BEFORE UPDATE ON public.sp_services
  FOR EACH ROW EXECUTE FUNCTION public.sp_touch_updated_at();

-- sp_candidats
CREATE TABLE public.sp_candidats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  numero text NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  sexe text,
  date_naissance date,
  classe_demandee text,
  ecole_origine text,
  parent text,
  telephone text,
  date_test timestamptz,
  statut public.sp_candidat_statut NOT NULL DEFAULT 'en_attente',
  converti_eleve_id uuid,
  observations text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, numero)
);
CREATE INDEX ON public.sp_candidats(ecole_id, statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sp_candidats TO authenticated;
GRANT ALL ON public.sp_candidats TO service_role;
ALTER TABLE public.sp_candidats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_candidats_read" ON public.sp_candidats FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "sp_candidats_write" ON public.sp_candidats FOR ALL TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id))
  WITH CHECK (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE TRIGGER trg_sp_candidats_touch BEFORE UPDATE ON public.sp_candidats
  FOR EACH ROW EXECUTE FUNCTION public.sp_touch_updated_at();

CREATE OR REPLACE FUNCTION public.sp_generate_candidat_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_year text := to_char(now(),'YYYY'); v_count int;
BEGIN
  IF NEW.numero IS NOT NULL AND length(NEW.numero) > 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*)+1 INTO v_count FROM public.sp_candidats
    WHERE ecole_id = NEW.ecole_id AND numero LIKE 'CAND-'||v_year||'-%';
  NEW.numero := 'CAND-'||v_year||'-'||lpad(v_count::text,4,'0');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sp_candidats_numero BEFORE INSERT ON public.sp_candidats
  FOR EACH ROW EXECUTE FUNCTION public.sp_generate_candidat_numero();

-- sp_ventes_tenues
CREATE TABLE public.sp_ventes_tenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  numero text NOT NULL,
  acheteur_type public.sp_beneficiaire_type NOT NULL,
  eleve_id uuid,
  candidat_id uuid,
  acheteur_libre text,
  quantite int NOT NULL DEFAULT 1,
  prix_unitaire numeric NOT NULL DEFAULT 0,
  montant_total numeric NOT NULL DEFAULT 0,
  mode_paiement public.sp_mode_paiement NOT NULL DEFAULT 'especes',
  statut public.sp_vente_statut NOT NULL DEFAULT 'paye',
  caissier_id uuid,
  observations text,
  annule_le timestamptz,
  annule_par uuid,
  motif_annulation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, numero)
);
CREATE INDEX ON public.sp_ventes_tenues(ecole_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sp_ventes_tenues TO authenticated;
GRANT ALL ON public.sp_ventes_tenues TO service_role;
ALTER TABLE public.sp_ventes_tenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_ventes_read" ON public.sp_ventes_tenues FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "sp_ventes_write" ON public.sp_ventes_tenues FOR ALL TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id))
  WITH CHECK (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE TRIGGER trg_sp_ventes_touch BEFORE UPDATE ON public.sp_ventes_tenues
  FOR EACH ROW EXECUTE FUNCTION public.sp_touch_updated_at();

CREATE OR REPLACE FUNCTION public.sp_generate_vente_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_year text := to_char(now(),'YYYY'); v_count int;
BEGIN
  IF NEW.numero IS NOT NULL AND length(NEW.numero) > 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*)+1 INTO v_count FROM public.sp_ventes_tenues
    WHERE ecole_id = NEW.ecole_id AND numero LIKE 'TEN-'||v_year||'-%';
  NEW.numero := 'TEN-'||v_year||'-'||lpad(v_count::text,4,'0');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sp_ventes_numero BEFORE INSERT ON public.sp_ventes_tenues
  FOR EACH ROW EXECUTE FUNCTION public.sp_generate_vente_numero();

-- sp_paiements
CREATE TABLE public.sp_paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  numero text NOT NULL,
  service_id uuid NOT NULL REFERENCES public.sp_services(id) ON DELETE RESTRICT,
  beneficiaire_type public.sp_beneficiaire_type NOT NULL,
  eleve_id uuid,
  candidat_id uuid,
  beneficiaire_libre text,
  montant_du numeric NOT NULL DEFAULT 0,
  montant_paye numeric NOT NULL DEFAULT 0,
  remise numeric NOT NULL DEFAULT 0,
  mode_paiement public.sp_mode_paiement NOT NULL DEFAULT 'especes',
  caissier_id uuid,
  date_paiement timestamptz NOT NULL DEFAULT now(),
  observations text,
  annule_le timestamptz,
  annule_par uuid,
  motif_annulation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, numero)
);
CREATE INDEX ON public.sp_paiements(ecole_id, date_paiement DESC);
CREATE INDEX ON public.sp_paiements(service_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sp_paiements TO authenticated;
GRANT ALL ON public.sp_paiements TO service_role;
ALTER TABLE public.sp_paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_paiements_read" ON public.sp_paiements FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "sp_paiements_write" ON public.sp_paiements FOR ALL TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id))
  WITH CHECK (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE TRIGGER trg_sp_paiements_touch BEFORE UPDATE ON public.sp_paiements
  FOR EACH ROW EXECUTE FUNCTION public.sp_touch_updated_at();

CREATE OR REPLACE FUNCTION public.sp_generate_paiement_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_year text := to_char(now(),'YYYY'); v_count int;
BEGIN
  IF NEW.numero IS NOT NULL AND length(NEW.numero) > 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*)+1 INTO v_count FROM public.sp_paiements
    WHERE ecole_id = NEW.ecole_id AND numero LIKE 'SP-'||v_year||'-%';
  NEW.numero := 'SP-'||v_year||'-'||lpad(v_count::text,5,'0');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sp_paiements_numero BEFORE INSERT ON public.sp_paiements
  FOR EACH ROW EXECUTE FUNCTION public.sp_generate_paiement_numero();

-- Seed catalogue
INSERT INTO public.sp_services (ecole_id, slug, nom, description, prix, accepte_partiel, couleur, icone)
SELECT e.id, 'test_entree', 'Test d''entrée', 'Frais d''évaluation à l''entrée', 0, false, '#6E1A2C', 'ClipboardCheck'
FROM public.ecoles e ON CONFLICT (ecole_id, slug) DO NOTHING;

INSERT INTO public.sp_services (ecole_id, slug, nom, description, prix, gere_stock, couleur, icone)
SELECT e.id, 'tenue_scolaire', 'Tenue scolaire', 'Vente de tenues scolaires', 0, true, '#FCE34D', 'Shirt'
FROM public.ecoles e ON CONFLICT (ecole_id, slug) DO NOTHING;

-- RPC conversion candidat -> élève
CREATE OR REPLACE FUNCTION public.sp_convertir_candidat(_candidat_id uuid, _annee_id uuid, _classe_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_c public.sp_candidats%ROWTYPE; v_eleve_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_c FROM public.sp_candidats WHERE id = _candidat_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidat introuvable'; END IF;
  IF NOT private.user_belongs_to_ecole(auth.uid(), v_c.ecole_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF v_c.converti_eleve_id IS NOT NULL THEN RETURN v_c.converti_eleve_id; END IF;

  INSERT INTO public.eleves (ecole_id, annee_id, classe_id, nom, prenom, sexe, date_naissance, statut)
  VALUES (v_c.ecole_id, _annee_id, _classe_id, v_c.nom, v_c.prenom, v_c.sexe, v_c.date_naissance, 'pre_inscrit')
  RETURNING id INTO v_eleve_id;

  UPDATE public.sp_candidats SET converti_eleve_id = v_eleve_id, statut = 'admis', updated_at = now()
    WHERE id = _candidat_id;

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (v_c.ecole_id, auth.uid(), 'sp_conversion_candidat', 'sp_candidats:'||_candidat_id::text, 'info',
          jsonb_build_object('eleve_id', v_eleve_id, 'candidat', v_c.nom||' '||v_c.prenom));

  RETURN v_eleve_id;
END $$;

-- RPC annulation paiement
CREATE OR REPLACE FUNCTION public.sp_annuler_paiement(_paiement_id uuid, _motif text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p public.sp_paiements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN RAISE EXCEPTION 'Motif obligatoire'; END IF;
  SELECT * INTO v_p FROM public.sp_paiements WHERE id = _paiement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), v_p.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_p.ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin ou directeur requis';
  END IF;
  UPDATE public.sp_paiements
    SET annule_le = now(), annule_par = auth.uid(), motif_annulation = _motif, updated_at = now()
    WHERE id = _paiement_id;
  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (v_p.ecole_id, auth.uid(), 'sp_annulation_paiement', 'sp_paiements:'||_paiement_id::text, 'attention',
          jsonb_build_object('motif', _motif, 'montant', v_p.montant_paye));
END $$;

-- Enregistrer le module
INSERT INTO public.app_modules (key, label, icon, ordre)
VALUES ('services_ponctuels', 'Services ponctuels', 'Ticket', 100)
ON CONFLICT (key) DO NOTHING;
