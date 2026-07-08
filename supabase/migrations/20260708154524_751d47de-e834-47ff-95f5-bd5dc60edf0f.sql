
CREATE TABLE public.contrats_enseignants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  enseignant_id uuid NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  parent_contrat_id uuid REFERENCES public.contrats_enseignants(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('CDD','CDI','vacation','stage')),
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('brouillon','actif','suspendu','rompu','termine')),
  date_debut date NOT NULL,
  date_fin date,
  periode_essai_fin date,
  preavis_jours int DEFAULT 30,
  quotite numeric(5,2) DEFAULT 100 CHECK (quotite > 0 AND quotite <= 100),
  salaire_base numeric(14,2) DEFAULT 0,
  primes jsonb DEFAULT '[]'::jsonb,
  motif_rupture text,
  date_rupture date,
  signe_le date,
  notes text,
  cree_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrats_enseignants TO authenticated;
GRANT ALL ON public.contrats_enseignants TO service_role;

ALTER TABLE public.contrats_enseignants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrats_select_ecole_staff"
  ON public.contrats_enseignants FOR SELECT TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
    OR EXISTS (SELECT 1 FROM public.enseignants e WHERE e.id = enseignant_id AND e.user_id = auth.uid())
  );

CREATE POLICY "contrats_insert_admin_directeur"
  ON public.contrats_enseignants FOR INSERT TO authenticated
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

CREATE POLICY "contrats_update_admin_directeur"
  ON public.contrats_enseignants FOR UPDATE TO authenticated
  USING (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  );

CREATE POLICY "contrats_delete_admin"
  ON public.contrats_enseignants FOR DELETE TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role));

CREATE TRIGGER trg_contrats_enseignants_updated_at
  BEFORE UPDATE ON public.contrats_enseignants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_contrats_ens_ecole ON public.contrats_enseignants(ecole_id);
CREATE INDEX idx_contrats_ens_enseignant ON public.contrats_enseignants(enseignant_id);
CREATE INDEX idx_contrats_ens_statut ON public.contrats_enseignants(statut);

ALTER TABLE public.enseignant_matieres
  ADD COLUMN IF NOT EXISTS volume_horaire_hebdo numeric(5,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION public.resilier_contrat_enseignant(
  _contrat_id uuid,
  _motif text,
  _date_rupture date DEFAULT CURRENT_DATE
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ecole uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT ecole_id INTO v_ecole FROM public.contrats_enseignants WHERE id = _contrat_id;
  IF v_ecole IS NULL THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), v_ecole, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ecole, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin ou directeur requis';
  END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 5 THEN
    RAISE EXCEPTION 'Motif de rupture obligatoire (5 caractères minimum)';
  END IF;

  UPDATE public.contrats_enseignants
     SET statut = 'rompu', motif_rupture = _motif, date_rupture = _date_rupture, updated_at = now()
   WHERE id = _contrat_id;

  PERFORM public.log_security_event(
    'contrat_enseignant_rompu', 'warning', v_ecole, NULL, NULL, NULL,
    jsonb_build_object('contrat_id', _contrat_id, 'motif', _motif, 'date', _date_rupture)
  );
END;
$$;
