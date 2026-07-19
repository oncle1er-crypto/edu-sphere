
-- Fix 1 : recalculer_grille_ecole doit passer _force_recalc = false pour préserver les tranches déjà (partiellement/totalement) payées
CREATE OR REPLACE FUNCTION public.recalculer_grille_ecole(_ecole_id uuid, _annee_id uuid, _niveau_code text DEFAULT NULL::text, _seulement_pre_inscrits boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eleve RECORD;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : admin/comptable/directeur requis';
  END IF;

  FOR v_eleve IN
    SELECT e.id
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.ecole_id = _ecole_id
      AND e.annee_id = _annee_id
      AND COALESCE(e.statut::text, '') <> 'sorti'
      AND (_niveau_code IS NULL OR public.resoudre_niveau_code(c.nom) = _niveau_code)
      AND (NOT _seulement_pre_inscrits OR e.statut::text = 'pre_inscrit')
  LOOP
    BEGIN
      -- IMPORTANT : false pour ne PAS toucher aux tranches déjà encaissées (paye > 0)
      PERFORM public.generer_tranches_eleve(v_eleve.id, false);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('eleves_traites', v_count);
END;
$function$;

-- Fix 2 : autoriser les rôles applicatifs à exécuter check_and_promote_eleve (SECURITY DEFINER + garde-fous internes)
GRANT EXECUTE ON FUNCTION public.check_and_promote_eleve(uuid) TO authenticated;
