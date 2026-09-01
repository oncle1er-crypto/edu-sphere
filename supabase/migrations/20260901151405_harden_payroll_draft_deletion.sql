-- Durcit la suppression des bulletins de paie : verrouillage concurrent,
-- liste blanche des statuts supprimables et traçabilité de l'opération.
CREATE OR REPLACE FUNCTION public.rh_supprimer_bulletin(_bulletin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b public.bulletins_paie%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'not_authenticated');
  END IF;

  SELECT *
    INTO b
    FROM public.bulletins_paie
   WHERE id = _bulletin_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'bulletin_introuvable');
  END IF;

  IF NOT (private.has_ecole_role(auth.uid(), b.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'comptable'::app_role)) THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'not_authorized');
  END IF;

  -- `en_attente` est l'ancien nom du statut brouillon.
  IF b.statut NOT IN ('brouillon', 'en_attente') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erreur', CASE
        WHEN b.statut = 'paye' THEN 'bulletin_deja_paye'
        WHEN b.statut = 'valide' THEN 'bulletin_deja_valide'
        ELSE 'bulletin_non_supprimable'
      END
    );
  END IF;

  -- Les lignes sont supprimées par la clé étrangère ON DELETE CASCADE.
  DELETE FROM public.bulletins_paie WHERE id = _bulletin_id;

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    b.ecole_id,
    auth.uid(),
    'paie.supprimer_brouillon',
    _bulletin_id::text,
    'warning',
    jsonb_build_object(
      'enseignant_id', b.enseignant_id,
      'mois', b.mois,
      'annee', b.annee,
      'statut', b.statut,
      'net_a_payer', b.net_a_payer
    )
  );

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.rh_supprimer_bulletin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_supprimer_bulletin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rh_supprimer_bulletin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_supprimer_bulletin(uuid) TO service_role;
