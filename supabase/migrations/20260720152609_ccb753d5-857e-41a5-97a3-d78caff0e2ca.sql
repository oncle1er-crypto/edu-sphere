
-- ============================================================
-- 1) Table : transport_carburant
-- ============================================================
CREATE TABLE public.transport_carburant (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  vehicule_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  chauffeur_id uuid REFERENCES public.chauffeurs(id) ON DELETE SET NULL,
  date_plein date NOT NULL DEFAULT CURRENT_DATE,
  litres numeric(8,2) NOT NULL CHECK (litres > 0),
  prix_litre numeric(8,2) NOT NULL CHECK (prix_litre >= 0),
  montant numeric(12,0) NOT NULL CHECK (montant >= 0),
  km_compteur integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transport_carburant_ecole ON public.transport_carburant(ecole_id, date_plein DESC);
CREATE INDEX idx_transport_carburant_vehicule ON public.transport_carburant(vehicule_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_carburant TO authenticated;
GRANT ALL ON public.transport_carburant TO service_role;
ALTER TABLE public.transport_carburant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.transport_carburant
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.transport_carburant
  FOR ALL TO authenticated
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

CREATE TRIGGER trg_transport_carburant_updated_at
  BEFORE UPDATE ON public.transport_carburant
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2) Table : transport_incidents
-- ============================================================
CREATE TABLE public.transport_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE SET NULL,
  chauffeur_id uuid REFERENCES public.chauffeurs(id) ON DELETE SET NULL,
  date_incident date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'panne',       -- panne, accident, retard, autre
  gravite text NOT NULL DEFAULT 'mineure',  -- mineure, moyenne, majeure
  description text NOT NULL,
  statut text NOT NULL DEFAULT 'ouvert',    -- ouvert, en_cours, traite
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transport_incidents_ecole ON public.transport_incidents(ecole_id, date_incident DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_incidents TO authenticated;
GRANT ALL ON public.transport_incidents TO service_role;
ALTER TABLE public.transport_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.transport_incidents
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.transport_incidents
  FOR ALL TO authenticated
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

CREATE TRIGGER trg_transport_incidents_updated_at
  BEFORE UPDATE ON public.transport_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3) Table : transport_maintenance
-- ============================================================
CREATE TABLE public.transport_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  vehicule_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'vidange',   -- vidange, revision, reparation, controle_technique, assurance, autre
  date_operation date NOT NULL DEFAULT CURRENT_DATE,
  km_compteur integer,
  cout numeric(12,0) NOT NULL DEFAULT 0 CHECK (cout >= 0),
  garage text,
  description text,
  prochaine_echeance_date date,
  prochaine_echeance_km integer,
  statut text NOT NULL DEFAULT 'realise',  -- realise, planifie, en_cours
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transport_maintenance_ecole ON public.transport_maintenance(ecole_id, date_operation DESC);
CREATE INDEX idx_transport_maintenance_vehicule ON public.transport_maintenance(vehicule_id);
CREATE INDEX idx_transport_maintenance_echeance ON public.transport_maintenance(prochaine_echeance_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_maintenance TO authenticated;
GRANT ALL ON public.transport_maintenance TO service_role;
ALTER TABLE public.transport_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.transport_maintenance
  FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.transport_maintenance
  FOR ALL TO authenticated
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

CREATE TRIGGER trg_transport_maintenance_updated_at
  BEFORE UPDATE ON public.transport_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4) RPC : enregistrer_paiement_facture
-- ============================================================
CREATE OR REPLACE FUNCTION public.enregistrer_paiement_facture(
  _facture_id uuid,
  _montant numeric,
  _mode text DEFAULT 'especes',
  _reference text DEFAULT NULL,
  _recu_par uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture RECORD;
  v_paiement_id uuid;
  v_new_paye numeric;
  v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_facture FROM public.factures WHERE id = _facture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'comptable'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle admin, directeur ou comptable requis';
  END IF;

  IF _montant IS NULL OR _montant <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  IF _montant > (v_facture.montant - v_facture.montant_paye) THEN
    RAISE EXCEPTION 'Le montant dépasse le reste dû (%)', (v_facture.montant - v_facture.montant_paye);
  END IF;

  -- Génère la référence du reçu si absente
  IF _reference IS NULL OR length(btrim(_reference)) = 0 THEN
    _reference := 'REC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
  END IF;

  INSERT INTO public.paiements (
    ecole_id, eleve_id, tranche_id, montant, mode, reference, recu_par, date_paiement, notes
  ) VALUES (
    v_facture.ecole_id,
    v_facture.eleve_id,
    NULL,
    _montant,
    _mode::paiement_mode,
    _reference,
    _recu_par,
    CURRENT_DATE,
    'Facture ' || v_facture.numero || ' — ' || v_facture.libelle
  )
  RETURNING id INTO v_paiement_id;

  v_new_paye := v_facture.montant_paye + _montant;
  v_new_statut := CASE
    WHEN v_new_paye >= v_facture.montant THEN 'payee'
    WHEN v_new_paye > 0 THEN 'partielle'
    ELSE v_facture.statut
  END;

  UPDATE public.factures
     SET montant_paye = v_new_paye,
         statut = v_new_statut,
         updated_at = now()
   WHERE id = _facture_id;

  RETURN v_paiement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_paiement_facture(uuid, numeric, text, text, uuid) TO authenticated;
