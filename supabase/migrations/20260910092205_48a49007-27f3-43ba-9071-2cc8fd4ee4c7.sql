ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS justificatif_chemin text,
  ADD COLUMN IF NOT EXISTS justificatif_nom text;

CREATE OR REPLACE FUNCTION public.rembourser_paiement_scolarite(_paiement_id uuid, _motif text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pai paiements%ROWTYPE;
  v_tranche tranches%ROWTYPE;
  v_posterieur RECORD;
  v_nouveau_paye numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 5 THEN RAISE EXCEPTION 'motif_requis'; END IF;

  SELECT * INTO v_pai FROM paiements WHERE id = _paiement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'paiement_introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'directeur'::app_role)
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF v_pai.annule_le IS NOT NULL THEN RAISE EXCEPTION 'deja_annule'; END IF;
  IF v_pai.facture_id IS NOT NULL THEN RAISE EXCEPTION 'paiement_facture'; END IF;
  IF v_pai.tranche_id IS NULL THEN RAISE EXCEPTION 'paiement_hors_tranche'; END IF;

  SELECT * INTO v_tranche FROM tranches WHERE id = v_pai.tranche_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tranche_introuvable'; END IF;

  SELECT t.numero INTO v_posterieur
  FROM tranches t
  WHERE t.eleve_id = v_tranche.eleve_id
    AND t.frais_id = v_tranche.frais_id
    AND t.numero > v_tranche.numero
    AND t.paye > 0
  ORDER BY t.numero ASC LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'tranche_posterieure_payee:%', v_posterieur.numero;
  END IF;

  UPDATE paiements
     SET annule_le = now(),
         annule_par = auth.uid(),
         motif_annulation = 'REMBOURSEMENT — ' || btrim(_motif)
   WHERE id = _paiement_id;

  SELECT paye INTO v_nouveau_paye FROM tranches WHERE id = v_pai.tranche_id;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (v_pai.ecole_id, auth.uid(), 'paiement.rembourser_scolarite', _paiement_id::text, 'warning',
    jsonb_build_object(
      'eleve_id', v_pai.eleve_id, 'tranche_id', v_pai.tranche_id,
      'tranche_numero', v_tranche.numero, 'montant_rembourse', v_pai.montant,
      'mode', v_pai.mode, 'reference', v_pai.reference, 'motif', btrim(_motif)));

  RETURN jsonb_build_object(
    'ok', true, 'tranche_id', v_pai.tranche_id,
    'tranche_numero', v_tranche.numero,
    'montant_rembourse', v_pai.montant,
    'nouveau_paye_tranche', v_nouveau_paye);
END; $function$;

REVOKE ALL ON FUNCTION public.rembourser_paiement_scolarite(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rembourser_paiement_scolarite(uuid, text) TO authenticated;
