-- Remboursement d'un encaissement de scolarité (élève désinscrit avec des
-- paiements déjà effectués, ou remboursement ponctuel décidé par la
-- direction). Décision produit du 09/09/2026 (validée avec l'utilisateur) :
-- l'école rembourse au cas par cas — nécessite donc un justificatif
-- imprimable et une traçabilité distincte d'une simple annulation pour
-- erreur de saisie.
--
-- Choix d'implémentation : un remboursement est une annulation
-- (`annuler_paiement_scolarite`) à laquelle on ajoute une marque `rembourse`.
-- On réutilise donc à l'identique toute la logique déjà validée en
-- production (authentification, rôle admin/directeur requis, paiement pas
-- déjà annulé, hors facture, rattaché à une tranche, aucune tranche
-- postérieure déjà payée) plutôt que de dupliquer ces contrôles dans une
-- nouvelle fonction — minimise le risque de divergence/bug entre les deux
-- flux.
--
-- Important : la fonction existante est recréée avec un paramètre
-- supplémentaire (`_rembourse boolean DEFAULT false`). En PostgreSQL, changer
-- la signature d'une fonction ne "remplace" pas l'ancienne via CREATE OR
-- REPLACE (les fonctions sont identifiées par nom + types d'arguments) : sans
-- le DROP explicite ci-dessous, l'ancienne fonction à 2 arguments resterait
-- en base à côté de la nouvelle à 3 arguments, et un appel à 2 arguments
-- continuerait de résoudre vers l'ancienne (qui ne connaît pas `rembourse`).
-- Le DROP garantit qu'il n'existe qu'une seule version, donc que l'appel
-- existant de CancelPaymentDialog.tsx (2 arguments) passe bien par la
-- nouvelle fonction avec `_rembourse` par défaut à false — comportement
-- inchangé pour ce flux.

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS rembourse boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.annuler_paiement_scolarite(uuid, text);

CREATE FUNCTION public.annuler_paiement_scolarite(_paiement_id uuid, _motif text, _rembourse boolean DEFAULT false)
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
     SET annule_le = now(), annule_par = auth.uid(), motif_annulation = _motif, rembourse = _rembourse
   WHERE id = _paiement_id;

  SELECT paye INTO v_nouveau_paye FROM tranches WHERE id = v_pai.tranche_id;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (v_pai.ecole_id, auth.uid(),
    CASE WHEN _rembourse THEN 'paiement.rembourser_scolarite' ELSE 'paiement.annuler_scolarite' END,
    _paiement_id::text, 'warning',
    jsonb_build_object(
      'eleve_id', v_pai.eleve_id, 'tranche_id', v_pai.tranche_id,
      'tranche_numero', v_tranche.numero, 'montant_annule', v_pai.montant,
      'mode', v_pai.mode, 'reference', v_pai.reference, 'motif', _motif,
      'rembourse', _rembourse));

  RETURN jsonb_build_object(
    'ok', true, 'tranche_id', v_pai.tranche_id,
    'tranche_numero', v_tranche.numero,
    'montant_annule', v_pai.montant,
    'rembourse', _rembourse,
    'nouveau_paye_tranche', v_nouveau_paye);
END; $function$;

-- Wrapper dédié pour la clarté côté client (nom explicite, distinct dans les
-- logs d'appel RPC de la simple annulation) — délègue entièrement à la
-- fonction ci-dessus, aucune logique dupliquée.
CREATE OR REPLACE FUNCTION public.rembourser_paiement_scolarite(_paiement_id uuid, _motif text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.annuler_paiement_scolarite(_paiement_id, _motif, true);
$function$;
