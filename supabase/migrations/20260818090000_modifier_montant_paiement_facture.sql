-- Corriger le montant d'un paiement de facture (erreur de saisie en Cantine,
-- Transport, ou tout autre module facturé via `factures`/`paiements`), sans
-- passer par une annulation complète + ressaisie.
--
-- Contexte (17-18/08/2026) : Expenses/Finances avait déjà "Annuler" (admin
-- uniquement côté UI) + "Modifier le mode" (admin/directeur/comptable), mais
-- aucun moyen de corriger un montant faux — l'utilisateur devait annuler puis
-- ressaisir un nouveau paiement, ce qui duplique les écritures d'audit et les
-- reçus. Cette RPC ajoute une correction directe, tracée, avec motif
-- obligatoire, réservée aux mêmes rôles que l'annulation existante.
--
-- Sécurité :
--   - Réservée à admin/directeur/comptable (même périmètre que
--     annuler_paiement_facture), vérifié explicitement dans la fonction
--     (SECURITY DEFINER, donc pas dépendante de la policy RLS "ecole_write"
--     qui elle n'autorise que admin/comptable en écriture directe).
--   - Le trigger existant trg_paiements_invariants (BEFORE UPDATE ON
--     paiements) continue de s'appliquer sur l'UPDATE ci-dessous : toute
--     correction qui mènerait à un surpaiement de la facture est rejetée
--     automatiquement, sans logique dupliquée ici.
--   - factures.montant_paye est recalculé par SOMME réelle des paiements
--     actifs (annule_le IS NULL) de la facture, plus robuste qu'un simple
--     delta si un écart existait déjà.

CREATE OR REPLACE FUNCTION public.modifier_montant_paiement_facture(
  _paiement_id uuid, _nouveau_montant numeric, _motif text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pai RECORD; v_fac RECORD;
  v_ancien_montant numeric;
  v_new_paye numeric; v_new_statut text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Motif obligatoire (3 caractères minimum)';
  END IF;
  IF _nouveau_montant IS NULL OR _nouveau_montant <= 0 THEN
    RAISE EXCEPTION 'Montant invalide (doit être strictement positif)';
  END IF;

  SELECT * INTO v_pai FROM public.paiements WHERE id = _paiement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'Accès refusé : rôle admin, directeur ou comptable requis'; END IF;

  IF v_pai.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'Ce paiement est annulé — impossible de modifier son montant';
  END IF;
  IF v_pai.facture_id IS NULL THEN
    RAISE EXCEPTION 'Ce paiement n''est pas rattaché à une facture (utiliser l''écran scolarité)';
  END IF;

  SELECT * INTO v_fac FROM public.factures WHERE id = v_pai.facture_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture liée introuvable'; END IF;

  v_ancien_montant := v_pai.montant;
  IF _nouveau_montant = v_ancien_montant THEN
    RAISE EXCEPTION 'Le nouveau montant est identique à l''ancien';
  END IF;

  -- Le trigger trg_paiements_invariants rejette nativement tout surpaiement
  -- (somme des paiements actifs de la facture, hors ce paiement, + nouveau
  -- montant > factures.montant) : aucune vérification dupliquée ici.
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

  -- Schéma réel de public.audit_logs (migration 20260508160149) : pas de
  -- colonnes entity_type/entity_id — ce sont cible/niveau/details, comme
  -- utilisé par les autres RPC financières (ex. sp_annulation_paiement,
  -- transfert_classe). L'identifiant du paiement est donc encodé dans
  -- `cible`, pas dans une colonne dédiée.
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.modifier_montant_paiement_facture(uuid, numeric, text) TO authenticated;
