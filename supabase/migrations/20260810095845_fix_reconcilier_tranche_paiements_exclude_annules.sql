-- Correction bug critique (audit module Paiements, 10/08/2026) :
--
-- La fonction trigger reconcilier_tranche_paiements() recalculait tranches.paye en
-- sommant TOUS les paiements liés à la tranche (SELECT SUM(montant) ... WHERE tranche_id = ...),
-- sans exclure les paiements annulés (annule_le IS NOT NULL).
--
-- Consequence : apres l'annulation d'un encaissement ou d'une remise (RPC
-- annuler_paiement_scolarite), la tranche restait comptee comme payee/partielle pour
-- le montant annule, car ce trigger (declenche sur l'UPDATE de annule_le) recalculait
-- un total identique a l'avant-annulation.
--
-- Reproduit et verifie en local le 10/08/2026 : ecart de exactement 3 000 FCFA entre
-- SUM(tranches.paye) et SUM(paiements valides) apres une annulation de test, ecart
-- disparu apres correction.
--
-- Diagnostic en production (lecture seule, 10/08/2026) : aucune derive constatee a ce
-- jour sur les tranches de scolarite (0 paiement scolarite annule en production).
-- Aucune migration de reconciliation de donnees n'est donc necessaire en complement.
--
-- Seul changement : ajout du filtre "AND annule_le IS NULL" dans le SELECT SUM.
-- Aucun changement de schema, aucune donnee touchee par cette migration.

CREATE OR REPLACE FUNCTION public.reconcilier_tranche_paiements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  FROM public.paiements
  WHERE tranche_id = v_tranche_id
    AND annule_le IS NULL;

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
$function$;
