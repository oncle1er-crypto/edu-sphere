-- Resynchronisation (pas une correction fonctionnelle) : le déploiement en
-- production de la migration 20260818090000 (via l'éditeur SQL Lovable Cloud,
-- faute d'accès CLI direct à ce projet) a nécessité de contourner un bug de
-- l'éditeur qui échouait systématiquement sur la saisie de texte long
-- contenant des caractères accentués. Les messages RAISE EXCEPTION ont donc
-- été saisis sans accents, et l'un d'eux légèrement raccourci : « Ce paiement
-- n'est pas rattaché à une facture (utiliser l'écran scolarité) » est devenu
-- « Ce paiement n'est pas rattache a une facture ». Aucun impact fonctionnel
-- (texte affiché à l'utilisateur en cas d'erreur uniquement) — mais le fichier
-- git ne reflétait plus fidèlement l'état réel de production.
--
-- Ce fichier reproduit, vérifié caractère pour caractère via
-- pg_get_functiondef sur la base de production, le corps exact qui y est
-- effectivement déployé. Il n'a donc aucun effet en production (no-op
-- strict) ; il sert uniquement à ce que git reflète la réalité, à l'image de
-- la migration 20260818110000 pour annuler_paiement_facture.

CREATE OR REPLACE FUNCTION public.modifier_montant_paiement_facture(
  _paiement_id uuid, _nouveau_montant numeric, _motif text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_pai RECORD; v_fac RECORD;
  v_ancien_montant numeric;
  v_new_paye numeric; v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Motif obligatoire (3 caracteres minimum)';
  END IF;
  IF _nouveau_montant IS NULL OR _nouveau_montant <= 0 THEN
    RAISE EXCEPTION 'Montant invalide (doit etre strictement positif)';
  END IF;

  SELECT * INTO v_pai FROM public.paiements WHERE id = _paiement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'Acces refuse : role admin, directeur ou comptable requis'; END IF;

  IF v_pai.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'Ce paiement est annule - impossible de modifier son montant';
  END IF;
  IF v_pai.facture_id IS NULL THEN
    RAISE EXCEPTION 'Ce paiement n''est pas rattache a une facture';
  END IF;

  SELECT * INTO v_fac FROM public.factures WHERE id = v_pai.facture_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture liee introuvable'; END IF;

  v_ancien_montant := v_pai.montant;
  IF _nouveau_montant = v_ancien_montant THEN
    RAISE EXCEPTION 'Le nouveau montant est identique a l''ancien';
  END IF;

  UPDATE public.paiements SET montant = _nouveau_montant WHERE id = _paiement_id;

  SELECT COALESCE(SUM(montant), 0) INTO v_new_paye
  FROM public.paiements WHERE facture_id = v_fac.id AND annule_le IS NULL;

  v_new_statut := CASE
    WHEN v_new_paye >= v_fac.montant THEN 'payee'
    WHEN v_new_paye > 0 THEN 'partielle'
    ELSE 'emise' END;

  UPDATE public.factures
     SET montant_paye = v_new_paye, statut = v_new_statut, updated_at = now()
   WHERE id = v_fac.id;

  INSERT INTO public.audit_logs (
    ecole_id, user_id, action, cible, niveau, details
  ) VALUES (
    v_pai.ecole_id, auth.uid(), 'paiement_montant_modifie', 'paiement:' || _paiement_id::text, 'attention',
    jsonb_build_object(
      'facture_id', v_fac.id, 'facture_numero', v_fac.numero,
      'ancien_montant', v_ancien_montant, 'nouveau_montant', _nouveau_montant,
      'motif', _motif, 'reference', v_pai.reference
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'facture_id', v_fac.id,
    'ancien_montant', v_ancien_montant,
    'nouveau_montant_paye', v_new_paye,
    'nouveau_statut', v_new_statut
  );
END; $function$;

GRANT EXECUTE ON FUNCTION public.modifier_montant_paiement_facture(uuid, numeric, text) TO authenticated;
