
-- 1) Étendre l'enum paiement_mode
ALTER TYPE public.paiement_mode ADD VALUE IF NOT EXISTS 'remise';
ALTER TYPE public.paiement_mode ADD VALUE IF NOT EXISTS 'bourse';
ALTER TYPE public.paiement_mode ADD VALUE IF NOT EXISTS 'prise_en_charge';

-- 2) Ajouter motif sur paiements
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS motif text;

-- 3) Mise à jour enregistrer_paiement : interdire si tranche précédente non soldée
CREATE OR REPLACE FUNCTION public.enregistrer_paiement(_ecole_id uuid, _eleve_id uuid, _tranche_id uuid, _montant numeric, _mode text, _reference text DEFAULT NULL::text, _recu_par uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tranche RECORD;
  v_paiement_id uuid;
  v_total_paye numeric;
  v_new_statut tranche_statut;
  v_prev_unpaid RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle insuffisant pour cette école';
  END IF;

  IF _montant IS NULL OR _montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être strictement positif';
  END IF;

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

  -- Bloquer si une tranche antérieure n'est pas totalement soldée
  SELECT numero, label, montant, paye INTO v_prev_unpaid
  FROM public.tranches
  WHERE eleve_id = _eleve_id
    AND frais_id = v_tranche.frais_id
    AND numero < v_tranche.numero
    AND paye < montant
  ORDER BY numero ASC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Tranche % non soldée : impossible d''encaisser la tranche % avant de solder la précédente.',
      v_prev_unpaid.numero, v_tranche.numero;
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE tranche_id = _tranche_id;

  IF v_total_paye + _montant > v_tranche.montant THEN
    RAISE EXCEPTION 'Surpaiement interdit : la tranche est déjà payée à hauteur de % FCFA sur % FCFA',
      v_total_paye, v_tranche.montant;
  END IF;

  INSERT INTO public.paiements (ecole_id, eleve_id, tranche_id, montant, mode, reference, recu_par)
  VALUES (_ecole_id, _eleve_id, _tranche_id, _montant, _mode::paiement_mode, _reference, _recu_par)
  RETURNING id INTO v_paiement_id;

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
$function$;

-- 4) Fonction appliquer_remise
CREATE OR REPLACE FUNCTION public.appliquer_remise(
  _ecole_id uuid,
  _eleve_id uuid,
  _tranche_id uuid,
  _montant numeric,
  _type_remise text,
  _motif text,
  _accorde_par uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tranche RECORD;
  v_paiement_id uuid;
  v_total numeric;
  v_new_statut tranche_statut;
  v_mode paiement_mode;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle insuffisant pour cette école';
  END IF;

  IF _montant IS NULL OR _montant <= 0 THEN
    RAISE EXCEPTION 'Le montant de la remise doit être strictement positif';
  END IF;

  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Le motif est obligatoire (3 caractères minimum)';
  END IF;

  v_mode := CASE lower(_type_remise)
    WHEN 'bourse' THEN 'bourse'::paiement_mode
    WHEN 'prise_en_charge' THEN 'prise_en_charge'::paiement_mode
    ELSE 'remise'::paiement_mode
  END;

  SELECT * INTO v_tranche
  FROM public.tranches
  WHERE id = _tranche_id AND ecole_id = _ecole_id AND eleve_id = _eleve_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tranche introuvable';
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total
  FROM public.paiements WHERE tranche_id = _tranche_id;

  IF v_total + _montant > v_tranche.montant THEN
    RAISE EXCEPTION 'Remise refusée : dépasse le reste dû (% / %).', v_total, v_tranche.montant;
  END IF;

  INSERT INTO public.paiements (ecole_id, eleve_id, tranche_id, montant, mode, reference, motif, recu_par)
  VALUES (_ecole_id, _eleve_id, _tranche_id, _montant, v_mode, _type_remise, _motif, COALESCE(_accorde_par, auth.uid()))
  RETURNING id INTO v_paiement_id;

  v_total := v_total + _montant;
  v_new_statut := CASE
    WHEN v_total >= v_tranche.montant THEN 'payee'::tranche_statut
    WHEN v_total > 0 THEN 'partielle'::tranche_statut
    WHEN v_tranche.echeance < CURRENT_DATE THEN 'retard'::tranche_statut
    ELSE 'due'::tranche_statut
  END;

  UPDATE public.tranches
  SET paye = v_total, statut = v_new_statut, updated_at = now()
  WHERE id = _tranche_id;

  RETURN v_paiement_id;
END;
$function$;
