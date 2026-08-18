-- Resynchronisation (pas une correction) : cette migration alignait à l'origine
-- annuler_paiement_facture sur la convention réelle audit_logs (cible/niveau au
-- lieu de entity_type/entity_id, colonnes inexistantes — cf. migration
-- 20260818090000 pour le même défaut sur la RPC sœur modifier_montant_paiement_
-- facture).
--
-- Correction du 18/08/2026, avant application en production : en interrogeant
-- directement la base de production (Lovable Cloud, éditeur SQL) via
-- pg_get_functiondef avant tout déploiement, il a été constaté que la fonction
-- annuler_paiement_facture RÉELLEMENT déployée en production N'EST PAS celle du
-- fichier de migration 20260720154949 versionné dans ce repo : elle utilise déjà
-- cible/niveau (pas de bug entity_type/entity_id en production), et diffère en
-- plus sur plusieurs points absents de ce repo :
--   - SELECT ... FOR UPDATE sur v_pai et v_fac (verrou anti race-condition) ;
--   - action = 'paiement.annuler' (et non 'paiement_annule') ;
--   - cible = _paiement_id::text (sans préfixe 'paiement:') ;
--   - niveau = 'warning' (et non 'attention') ;
--   - details inclut en plus 'eleve_id' ;
--   - messages d'erreur sans accents et légèrement reformulés.
-- Cette version de production n'a jamais été committée dans ce repo (probablement
-- appliquée directement via l'éditeur/agent Lovable, hors du flux de migrations
-- versionnées). Plutôt que d'écraser une version de production plus robuste
-- (verrou FOR UPDATE, eleve_id) par l'ancienne convention de ce fichier, cette
-- migration reproduit fidèlement le corps exact observé en production (lu via
-- pg_get_functiondef, vérifié caractère pour caractère), afin que : (1) git
-- reflète enfin la réalité, (2) l'application de cette migration en production
-- soit un no-op strict (CREATE OR REPLACE avec un corps identique à l'existant),
-- (3) une future db reset locale reproduise fidèlement le comportement réel de
-- production.

CREATE OR REPLACE FUNCTION public.annuler_paiement_facture(_paiement_id uuid, _motif text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_pai RECORD; v_fac RECORD;
  v_new_paye numeric; v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Motif obligatoire (3 caracteres minimum)';
  END IF;

  SELECT * INTO v_pai FROM public.paiements WHERE id = _paiement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'Acces refuse : role admin, directeur ou comptable requis'; END IF;

  IF v_pai.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'Ce paiement est deja annule';
  END IF;
  IF v_pai.facture_id IS NULL THEN
    RAISE EXCEPTION 'Ce paiement n''est pas rattache a une facture';
  END IF;

  SELECT * INTO v_fac FROM public.factures WHERE id = v_pai.facture_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture liee introuvable'; END IF;

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

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    v_pai.ecole_id, auth.uid(), 'paiement.annuler', _paiement_id::text, 'warning',
    jsonb_build_object(
      'facture_id', v_fac.id, 'facture_numero', v_fac.numero,
      'montant_annule', v_pai.montant, 'motif', _motif,
      'reference', v_pai.reference, 'eleve_id', v_pai.eleve_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'facture_id', v_fac.id,
    'nouveau_montant_paye', v_new_paye,
    'nouveau_statut', v_new_statut
  );
END; $function$;

GRANT EXECUTE ON FUNCTION public.annuler_paiement_facture(uuid, text) TO authenticated;
