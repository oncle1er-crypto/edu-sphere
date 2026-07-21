
-- Axe 1: Verrouillage strict des périodes
-- Empêche toute modification de notes/bulletins d'une période verrouillée

-- Fonction de vérification: retourne true si la période liée est verrouillée
CREATE OR REPLACE FUNCTION public.est_periode_verrouillee(_periode_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT statut::text = 'verrouillee' FROM public.periodes WHERE id = _periode_id),
    false
  );
$$;

-- Trigger sur notes: bloque INSERT/UPDATE/DELETE si période verrouillée
CREATE OR REPLACE FUNCTION public.trg_notes_periode_verrouillee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _periode_id uuid;
  _is_admin boolean;
BEGIN
  -- Admin peut toujours modifier (correction exceptionnelle)
  _is_admin := private.has_role(auth.uid(), 'admin'::app_role);
  IF _is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT e.periode_id INTO _periode_id
  FROM public.evaluations e
  WHERE e.id = COALESCE(NEW.evaluation_id, OLD.evaluation_id);

  IF _periode_id IS NOT NULL AND public.est_periode_verrouillee(_periode_id) THEN
    RAISE EXCEPTION 'Période verrouillée: aucune modification des notes autorisée. Contactez l''administration.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_lock_check ON public.notes;
CREATE TRIGGER trg_notes_lock_check
  BEFORE INSERT OR UPDATE OR DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.trg_notes_periode_verrouillee();

-- Trigger sur evaluations: idem (empêche création/modif d'éval dans période verrouillée)
CREATE OR REPLACE FUNCTION public.trg_evaluations_periode_verrouillee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  _is_admin := private.has_role(auth.uid(), 'admin'::app_role);
  IF _is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF COALESCE(NEW.periode_id, OLD.periode_id) IS NOT NULL
     AND public.est_periode_verrouillee(COALESCE(NEW.periode_id, OLD.periode_id)) THEN
    RAISE EXCEPTION 'Période verrouillée: aucune modification des évaluations autorisée.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluations_lock_check ON public.evaluations;
CREATE TRIGGER trg_evaluations_lock_check
  BEFORE INSERT OR UPDATE OR DELETE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.trg_evaluations_periode_verrouillee();

-- Trigger sur bulletins_audit: interdit toute modif d'un bulletin déjà locked=true (sauf admin)
CREATE OR REPLACE FUNCTION public.trg_bulletins_locked_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  _is_admin := private.has_role(auth.uid(), 'admin'::app_role);
  IF _is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' AND OLD.locked THEN
    RAISE EXCEPTION 'Bulletin verrouillé: suppression interdite.' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.locked
     AND (NEW.locked IS DISTINCT FROM OLD.locked
          OR NEW.moyenne IS DISTINCT FROM OLD.moyenne
          OR NEW.rang IS DISTINCT FROM OLD.rang
          OR NEW.mention IS DISTINCT FROM OLD.mention
          OR NEW.decision_conseil IS DISTINCT FROM OLD.decision_conseil) THEN
    -- Permet uniquement mise à jour des champs d'envoi (sent_at, sent_channels, sent_recipients, sent_by)
    RAISE EXCEPTION 'Bulletin verrouillé: modification interdite.' USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bulletins_locked_check ON public.bulletins_audit;
CREATE TRIGGER trg_bulletins_locked_check
  BEFORE UPDATE OR DELETE ON public.bulletins_audit
  FOR EACH ROW EXECUTE FUNCTION public.trg_bulletins_locked_check();
