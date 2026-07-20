
-- 1. Stock optionnel
ALTER TABLE public.sp_services ADD COLUMN IF NOT EXISTS stock_actuel INTEGER;

-- 2. Trigger stock ventes tenues (décrément à l'insertion, restauration à l'annulation)
CREATE OR REPLACE FUNCTION public.sp_ventes_stock_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_id UUID;
  v_gere BOOLEAN;
BEGIN
  -- Trouver le service "tenue" (slug 'tenue' ou 1er service gere_stock)
  SELECT id, gere_stock INTO v_service_id, v_gere
  FROM public.sp_services
  WHERE ecole_id = COALESCE(NEW.ecole_id, OLD.ecole_id)
    AND (slug = 'tenue' OR gere_stock = true)
  ORDER BY (slug = 'tenue') DESC
  LIMIT 1;

  IF v_service_id IS NULL OR v_gere IS NOT TRUE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.statut <> 'annule' THEN
    UPDATE public.sp_services
       SET stock_actuel = COALESCE(stock_actuel, 0) - NEW.quantite
     WHERE id = v_service_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.statut <> 'annule' AND NEW.statut = 'annule' THEN
      UPDATE public.sp_services
         SET stock_actuel = COALESCE(stock_actuel, 0) + OLD.quantite
       WHERE id = v_service_id;
    ELSIF OLD.statut = 'annule' AND NEW.statut <> 'annule' THEN
      UPDATE public.sp_services
         SET stock_actuel = COALESCE(stock_actuel, 0) - NEW.quantite
       WHERE id = v_service_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_ventes_stock ON public.sp_ventes_tenues;
CREATE TRIGGER trg_sp_ventes_stock
AFTER INSERT OR UPDATE ON public.sp_ventes_tenues
FOR EACH ROW EXECUTE FUNCTION public.sp_ventes_stock_trigger();

-- 3. Annulation de paiement service ponctuel
CREATE OR REPLACE FUNCTION public.sp_annuler_paiement(_paiement_id UUID, _motif TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _motif IS NULL OR length(trim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Motif requis (au moins 3 caractères)';
  END IF;

  UPDATE public.sp_paiements
     SET annule_le = now(),
         annule_par = auth.uid(),
         motif_annulation = _motif,
         updated_at = now()
   WHERE id = _paiement_id
     AND annule_le IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable ou déjà annulé';
  END IF;
END;
$$;

-- 4. Conversion d'un candidat en élève
CREATE OR REPLACE FUNCTION public.sp_convertir_candidat(
  _candidat_id UUID,
  _annee_id UUID,
  _classe_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  v_eleve_id UUID;
  v_matricule TEXT;
  v_seq INT;
BEGIN
  SELECT * INTO c FROM public.sp_candidats WHERE id = _candidat_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidat introuvable'; END IF;
  IF c.converti_eleve_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ce candidat a déjà été converti';
  END IF;

  -- Matricule = ELV-YYYY-NNNN sur ecole
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(matricule, '\D', '', 'g'), '')::int
  ), 0) + 1 INTO v_seq
  FROM public.eleves
  WHERE ecole_id = c.ecole_id;

  v_matricule := 'ELV-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.eleves (
    ecole_id, matricule, nom, prenom, sexe, date_naissance,
    classe_id, annee_id, statut, est_nouveau, date_inscription
  ) VALUES (
    c.ecole_id, v_matricule, c.nom, c.prenom,
    CASE WHEN c.sexe IN ('M','F') THEN c.sexe::sexe_type ELSE NULL END,
    c.date_naissance, _classe_id, _annee_id,
    CASE WHEN _classe_id IS NOT NULL THEN 'inscrit' ELSE 'pre_inscrit' END,
    true, CURRENT_DATE
  ) RETURNING id INTO v_eleve_id;

  UPDATE public.sp_candidats
     SET converti_eleve_id = v_eleve_id,
         statut = 'admis',
         updated_at = now()
   WHERE id = _candidat_id;

  RETURN v_eleve_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_annuler_paiement(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sp_convertir_candidat(UUID, UUID, UUID) TO authenticated;
