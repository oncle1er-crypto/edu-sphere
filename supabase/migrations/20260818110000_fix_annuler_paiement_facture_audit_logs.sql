-- Corrige un bug pré-existant de annuler_paiement_facture (migration
-- 20260720154949) : la fonction insérait dans public.audit_logs avec des
-- colonnes entity_type/entity_id qui n'ont jamais existé sur cette table
-- (schéma réel, migration 20260508160149 : id/ecole_id/user_id/user_label/
-- action/cible/niveau/details). Conséquence en production : tout appel au
-- bouton « Annuler » sur un paiement de facture (Cantine, Transport, ou tout
-- autre module facturé via factures/paiements) échouait systématiquement
-- avec l'erreur Postgres 42703 "column entity_type of relation audit_logs
-- does not exist" — la transaction entière était rollback (rien n'était
-- corrompu, mais la fonctionnalité était inutilisable).
--
-- Découvert le 18/08/2026 en testant la RPC sœur modifier_montant_paiement_
-- facture (même défaut, corrigé dans la migration 20260818090000, qui suit
-- la convention réelle cible/niveau utilisée par les autres RPC financières
-- : sp_annulation_paiement, transfert_classe, etc.).
--
-- Seul le bloc INSERT INTO audit_logs change ; le reste de la fonction
-- (vérifications de rôle, annulation du paiement, recalcul de
-- factures.montant_paye/statut) est strictement identique à l'original.

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

  -- Correction : cible/niveau au lieu de entity_type/entity_id (inexistants).
  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    v_pai.ecole_id, auth.uid(), 'paiement_annule', 'paiement:' || _paiement_id::text, 'attention',
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
