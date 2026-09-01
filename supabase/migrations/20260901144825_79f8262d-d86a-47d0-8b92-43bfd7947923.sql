CREATE OR REPLACE FUNCTION public.rh_supprimer_bulletin(_bulletin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'not_authenticated');
  END IF;

  SELECT * INTO b FROM bulletins_paie WHERE id = _bulletin_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'bulletin_introuvable');
  END IF;

  IF NOT (private.has_ecole_role(auth.uid(), b.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'comptable'::app_role)) THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'not_authorized');
  END IF;

  IF b.statut = 'paye' THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'bulletin_deja_paye');
  END IF;
  IF b.statut = 'valide' THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'bulletin_deja_valide');
  END IF;

  DELETE FROM rh_bulletin_lignes WHERE bulletin_id = _bulletin_id;
  DELETE FROM bulletins_paie WHERE id = _bulletin_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.rh_supprimer_bulletin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_supprimer_bulletin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_supprimer_bulletin(uuid) TO service_role;