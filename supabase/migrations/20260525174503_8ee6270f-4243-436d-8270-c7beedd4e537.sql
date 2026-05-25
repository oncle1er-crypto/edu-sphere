
-- 1. Fonction atomique d'enregistrement de paiement
CREATE OR REPLACE FUNCTION public.enregistrer_paiement(
  _ecole_id uuid,
  _eleve_id uuid,
  _tranche_id uuid,
  _montant numeric,
  _mode text,
  _reference text DEFAULT NULL,
  _recu_par uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tranche RECORD;
  v_paiement_id uuid;
  v_total_paye numeric;
  v_new_statut tranche_statut;
BEGIN
  IF _montant IS NULL OR _montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être strictement positif';
  END IF;

  -- Verrou pessimiste sur la tranche
  SELECT * INTO v_tranche
  FROM public.tranches
  WHERE id = _tranche_id AND ecole_id = _ecole_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tranche introuvable';
  END IF;

  IF v_tranche.eleve_id <> _eleve_id THEN
    RAISE EXCEPTION 'Tranche / élève incohérents';
  END IF;

  -- Calcule la somme réelle déjà payée (inclut les paiements existants)
  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE tranche_id = _tranche_id;

  IF v_total_paye + _montant > v_tranche.montant THEN
    RAISE EXCEPTION 'Surpaiement interdit : la tranche est déjà payée à hauteur de % FCFA sur % FCFA',
      v_total_paye, v_tranche.montant;
  END IF;

  -- Insertion du paiement
  INSERT INTO public.paiements (ecole_id, eleve_id, tranche_id, montant, mode, reference, recu_par)
  VALUES (_ecole_id, _eleve_id, _tranche_id, _montant, _mode::mode_paiement, _reference, _recu_par)
  RETURNING id INTO v_paiement_id;

  -- Mise à jour de la tranche (le trigger ferait aussi le job, on est explicite ici)
  v_total_paye := v_total_paye + _montant;
  v_new_statut := CASE
    WHEN v_total_paye >= v_tranche.montant THEN 'payee'::tranche_statut
    WHEN v_total_paye > 0 THEN 'partielle'::tranche_statut
    WHEN v_tranche.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
    ELSE 'due'::tranche_statut
  END;

  UPDATE public.tranches
  SET paye = v_total_paye, statut = v_new_statut, updated_at = now()
  WHERE id = _tranche_id;

  RETURN v_paiement_id;
END;
$$;

-- 2. Trigger de réconciliation automatique paiements -> tranches
CREATE OR REPLACE FUNCTION public.reconcilier_tranche_paiements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tranche_id uuid;
  v_total numeric;
  v_tranche RECORD;
  v_statut tranche_statut;
BEGIN
  v_tranche_id := COALESCE(NEW.tranche_id, OLD.tranche_id);
  IF v_tranche_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT * INTO v_tranche FROM public.tranches WHERE id = v_tranche_id;
  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total
  FROM public.paiements WHERE tranche_id = v_tranche_id;

  v_statut := CASE
    WHEN v_total >= v_tranche.montant THEN 'payee'::tranche_statut
    WHEN v_total > 0 THEN 'partielle'::tranche_statut
    WHEN v_tranche.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
    ELSE 'due'::tranche_statut
  END;

  UPDATE public.tranches
  SET paye = v_total, statut = v_statut, updated_at = now()
  WHERE id = v_tranche_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reconcilier_tranche_paiements ON public.paiements;
CREATE TRIGGER trg_reconcilier_tranche_paiements
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.reconcilier_tranche_paiements();

-- 3. Recalcule immédiat de toutes les tranches pour corriger l'historique
UPDATE public.tranches t
SET paye = sub.total,
    statut = CASE
      WHEN sub.total >= t.montant THEN 'payee'::tranche_statut
      WHEN sub.total > 0 THEN 'partielle'::tranche_statut
      WHEN t.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
      ELSE 'due'::tranche_statut
    END,
    updated_at = now()
FROM (
  SELECT tr.id AS tranche_id, COALESCE(SUM(p.montant), 0) AS total
  FROM public.tranches tr
  LEFT JOIN public.paiements p ON p.tranche_id = tr.id
  GROUP BY tr.id
) sub
WHERE t.id = sub.tranche_id
  AND (t.paye <> sub.total);

-- 4. Vue diagnostic
CREATE OR REPLACE VIEW public.v_paiements_incoherents
WITH (security_invoker = on) AS
SELECT t.id AS tranche_id, t.ecole_id, t.eleve_id, t.numero, t.montant, t.paye AS paye_tranche,
       COALESCE(SUM(p.montant), 0) AS somme_paiements
FROM public.tranches t
LEFT JOIN public.paiements p ON p.tranche_id = t.id
GROUP BY t.id
HAVING t.paye <> COALESCE(SUM(p.montant), 0);
