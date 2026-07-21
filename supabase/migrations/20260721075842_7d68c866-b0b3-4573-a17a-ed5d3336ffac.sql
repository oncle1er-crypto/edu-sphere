
-- 1) Helper: check if année is clôturée
CREATE OR REPLACE FUNCTION public.est_annee_cloturee(_annee_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.annees_scolaires WHERE id = _annee_id AND statut = 'cloturee')
$$;

-- 2) Lock trigger on classes and eleves.classe_id
CREATE OR REPLACE FUNCTION public.trg_lock_classes_annee_cloturee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND public.est_annee_cloturee(COALESCE(OLD.annee_id, NEW.annee_id)) THEN
    RAISE EXCEPTION 'Année scolaire clôturée : modification interdite';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_classes_lock_cloture ON public.classes;
CREATE TRIGGER trg_classes_lock_cloture
BEFORE UPDATE OR DELETE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.trg_lock_classes_annee_cloturee();

CREATE OR REPLACE FUNCTION public.trg_lock_eleves_classe_cloture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.classe_id IS DISTINCT FROM OLD.classe_id
     AND public.est_annee_cloturee(NEW.annee_id) THEN
    RAISE EXCEPTION 'Année scolaire clôturée : transfert interdit';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_eleves_classe_lock_cloture ON public.eleves;
CREATE TRIGGER trg_eleves_classe_lock_cloture
BEFORE UPDATE ON public.eleves
FOR EACH ROW EXECUTE FUNCTION public.trg_lock_eleves_classe_cloture();

-- 3) RPC: transferer_eleve (with capacity control)
CREATE OR REPLACE FUNCTION public.transferer_eleve(
  _eleve_id uuid,
  _classe_dest_id uuid,
  _motif text DEFAULT NULL,
  _force boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_ecole uuid; v_origin uuid; v_dest_cap int; v_dest_eff int;
  v_origin_nom text; v_dest_nom text; v_eleve_nom text;
BEGIN
  SELECT ecole_id, classe_id, nom || ' ' || prenom
    INTO v_ecole, v_origin, v_eleve_nom
    FROM public.eleves WHERE id = _eleve_id;
  IF v_ecole IS NULL THEN RAISE EXCEPTION 'Élève introuvable'; END IF;
  IF v_origin = _classe_dest_id THEN RAISE EXCEPTION 'Élève déjà dans cette classe'; END IF;

  SELECT capacite, nom INTO v_dest_cap, v_dest_nom FROM public.classes WHERE id = _classe_dest_id;
  SELECT nom INTO v_origin_nom FROM public.classes WHERE id = v_origin;
  SELECT COUNT(*) INTO v_dest_eff FROM public.eleves WHERE classe_id = _classe_dest_id;

  IF v_dest_cap IS NOT NULL AND v_dest_cap > 0 AND v_dest_eff >= v_dest_cap
     AND NOT _force AND NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Capacité atteinte pour %', v_dest_nom;
  END IF;

  UPDATE public.eleves SET classe_id = _classe_dest_id WHERE id = _eleve_id;

  INSERT INTO public.audit_logs (ecole_id, user_id, user_label, action, cible, niveau, details)
  VALUES (v_ecole, auth.uid(), COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()),'Système'),
          'transfert_classe', v_eleve_nom, 'info',
          jsonb_build_object('eleve_id', _eleve_id, 'eleve_nom', v_eleve_nom,
                             'de', COALESCE(v_origin_nom,'—'), 'vers', v_dest_nom,
                             'classe_origine_id', v_origin, 'classe_dest_id', _classe_dest_id,
                             'motif', _motif));
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 4) RPC: annuler_transfert
CREATE OR REPLACE FUNCTION public.annuler_transfert(_audit_log_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_details jsonb; v_eleve uuid; v_orig uuid; v_ecole uuid; v_created timestamptz; v_eleve_nom text; v_orig_nom text;
BEGIN
  SELECT details, ecole_id, created_at INTO v_details, v_ecole, v_created
    FROM public.audit_logs WHERE id = _audit_log_id AND action = 'transfert_classe';
  IF v_details IS NULL THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_created < now() - interval '30 days' THEN RAISE EXCEPTION 'Transfert trop ancien (>30 jours)'; END IF;
  v_eleve := (v_details->>'eleve_id')::uuid;
  v_orig  := (v_details->>'classe_origine_id')::uuid;
  v_eleve_nom := v_details->>'eleve_nom';
  v_orig_nom  := v_details->>'de';
  IF v_orig IS NULL THEN RAISE EXCEPTION 'Classe d''origine inconnue'; END IF;

  UPDATE public.eleves SET classe_id = v_orig WHERE id = v_eleve;

  INSERT INTO public.audit_logs (ecole_id, user_id, user_label, action, cible, niveau, details)
  VALUES (v_ecole, auth.uid(), COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()),'Système'),
          'annulation_transfert', v_eleve_nom, 'warning',
          jsonb_build_object('audit_log_source', _audit_log_id, 'eleve_id', v_eleve, 'retour_vers', v_orig_nom));
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 5) RPC: transferer_masse
CREATE OR REPLACE FUNCTION public.transferer_masse(
  _eleve_ids uuid[], _classe_dest_id uuid, _motif text DEFAULT NULL, _force boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_ok int := 0; v_err int := 0; v_errors jsonb := '[]'::jsonb;
BEGIN
  FOREACH v_id IN ARRAY _eleve_ids LOOP
    BEGIN
      PERFORM public.transferer_eleve(v_id, _classe_dest_id, _motif, _force);
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      v_errors := v_errors || jsonb_build_object('eleve_id', v_id, 'erreur', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('ok', v_ok, 'erreurs', v_err, 'details', v_errors);
END; $$;

GRANT EXECUTE ON FUNCTION public.transferer_eleve(uuid,uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.annuler_transfert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferer_masse(uuid[],uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.est_annee_cloturee(uuid) TO authenticated;
