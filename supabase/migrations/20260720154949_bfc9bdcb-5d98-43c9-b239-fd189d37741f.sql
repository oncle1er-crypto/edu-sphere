
-- 1. Colonnes de liaison et d'annulation
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS facture_id uuid REFERENCES public.factures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS annule_le timestamptz,
  ADD COLUMN IF NOT EXISTS annule_par uuid,
  ADD COLUMN IF NOT EXISTS motif_annulation text;

CREATE INDEX IF NOT EXISTS idx_paiements_facture_id ON public.paiements(facture_id) WHERE facture_id IS NOT NULL;

-- 2. Backfill facture_id depuis les notes ("Facture <numero> — ...")
UPDATE public.paiements p
   SET facture_id = f.id
  FROM public.factures f
 WHERE p.facture_id IS NULL
   AND p.ecole_id = f.ecole_id
   AND p.notes ILIKE 'Facture ' || f.numero || '%';

-- 3. RPC : enregistrer_paiement_facture (mise à jour, renseigne facture_id)
CREATE OR REPLACE FUNCTION public.enregistrer_paiement_facture(
  _facture_id uuid, _montant numeric, _mode text DEFAULT 'especes',
  _reference text DEFAULT NULL, _recu_par uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_facture RECORD; v_paiement_id uuid;
  v_new_paye numeric; v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_facture FROM public.factures WHERE id = _facture_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_facture.ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'Accès refusé : rôle admin, directeur ou comptable requis'; END IF;

  IF _montant IS NULL OR _montant <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF _montant > (v_facture.montant - v_facture.montant_paye) THEN
    RAISE EXCEPTION 'Le montant dépasse le reste dû (%)', (v_facture.montant - v_facture.montant_paye);
  END IF;

  IF _reference IS NULL OR length(btrim(_reference)) = 0 THEN
    _reference := 'REC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
  END IF;

  INSERT INTO public.paiements (
    ecole_id, eleve_id, tranche_id, facture_id, montant, mode, reference, recu_par, date_paiement, notes
  ) VALUES (
    v_facture.ecole_id, v_facture.eleve_id, NULL, v_facture.id,
    _montant, _mode::paiement_mode, _reference, _recu_par, CURRENT_DATE,
    'Facture ' || v_facture.numero || ' — ' || v_facture.libelle
  ) RETURNING id INTO v_paiement_id;

  v_new_paye := v_facture.montant_paye + _montant;
  v_new_statut := CASE
    WHEN v_new_paye >= v_facture.montant THEN 'payee'
    WHEN v_new_paye > 0 THEN 'partielle'
    ELSE v_facture.statut END;

  UPDATE public.factures
     SET montant_paye = v_new_paye, statut = v_new_statut, updated_at = now()
   WHERE id = _facture_id;

  RETURN v_paiement_id;
END; $$;

-- 4. RPC : annuler_paiement_facture
CREATE OR REPLACE FUNCTION public.annuler_paiement_facture(_paiement_id uuid, _motif text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pai RECORD; v_fac RECORD;
  v_new_paye numeric; v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Motif obligatoire (3 caractères minimum)';
  END IF;

  SELECT * INTO v_pai FROM public.paiements WHERE id = _paiement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'Accès refusé : rôle admin, directeur ou comptable requis'; END IF;

  IF v_pai.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'Ce paiement est déjà annulé';
  END IF;
  IF v_pai.facture_id IS NULL THEN
    RAISE EXCEPTION 'Ce paiement n''est pas rattaché à une facture (utiliser l''écran scolarité)';
  END IF;

  SELECT * INTO v_fac FROM public.factures WHERE id = v_pai.facture_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture liée introuvable'; END IF;

  UPDATE public.paiements
     SET annule_le = now(), annule_par = auth.uid(), motif_annulation = _motif
   WHERE id = _paiement_id;

  v_new_paye := GREATEST(0, v_fac.montant_paye - v_pai.montant);
  v_new_statut := CASE
    WHEN v_new_paye >= v_fac.montant THEN 'payee'
    WHEN v_new_paye > 0 THEN 'partielle'
    ELSE 'emise' END;

  UPDATE public.factures
     SET montant_paye = v_new_paye, statut = v_new_statut, updated_at = now()
   WHERE id = v_fac.id;

  INSERT INTO public.audit_logs (
    ecole_id, user_id, action, entity_type, entity_id, details
  ) VALUES (
    v_pai.ecole_id, auth.uid(), 'paiement_annule', 'paiement', _paiement_id,
    jsonb_build_object(
      'facture_id', v_fac.id, 'facture_numero', v_fac.numero,
      'montant_annule', v_pai.montant, 'motif', _motif,
      'reference', v_pai.reference
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'facture_id', v_fac.id,
    'nouveau_montant_paye', v_new_paye,
    'nouveau_statut', v_new_statut
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.annuler_paiement_facture(uuid, text) TO authenticated;
