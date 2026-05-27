
-- =========================================================
-- BULLETINS : audit, verrouillage de version, override conseil
-- =========================================================

-- 1) Table d'audit des bulletins (historique immuable une fois verrouillé)
CREATE TABLE IF NOT EXISTS public.bulletins_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  annee_id uuid NOT NULL,
  periode_id uuid NOT NULL,
  classe_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  version int NOT NULL DEFAULT 1,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid,
  moyenne numeric(5,2),
  rang int,
  mention text,
  appreciation_generale text,
  decision_conseil text,
  decision_detail text,
  pdf_hash text,
  pdf_path text,
  override_by uuid,
  override_at timestamptz,
  override_motif text,
  sent_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulletins_audit_lookup
  ON public.bulletins_audit(ecole_id, annee_id, periode_id, classe_id, eleve_id, version DESC);

GRANT SELECT, INSERT, UPDATE ON public.bulletins_audit TO authenticated;
GRANT ALL ON public.bulletins_audit TO service_role;

ALTER TABLE public.bulletins_audit ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'école
CREATE POLICY "bulletins_audit_select" ON public.bulletins_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.ecole_id = bulletins_audit.ecole_id
    )
  );

-- Écriture (insertion/update) : admin/directeur/enseignant — bloquée si verrouillé
CREATE POLICY "bulletins_audit_insert" ON public.bulletins_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role)
  );

CREATE POLICY "bulletins_audit_update" ON public.bulletins_audit
  FOR UPDATE TO authenticated
  USING (
    locked = false
    AND (
      private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
      OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role)
    )
  )
  WITH CHECK (
    private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'enseignant'::app_role)
  );

-- Trigger updated_at
CREATE TRIGGER trg_bulletins_audit_updated_at
  BEFORE UPDATE ON public.bulletins_audit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger : empêche TOUT changement après verrouillage (sauf marquage envoi)
CREATE OR REPLACE FUNCTION public.protect_locked_bulletin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked = true THEN
    -- Seuls les champs de traçabilité d'envoi peuvent évoluer
    IF NEW.moyenne IS DISTINCT FROM OLD.moyenne
       OR NEW.rang IS DISTINCT FROM OLD.rang
       OR NEW.mention IS DISTINCT FROM OLD.mention
       OR NEW.appreciation_generale IS DISTINCT FROM OLD.appreciation_generale
       OR NEW.decision_conseil IS DISTINCT FROM OLD.decision_conseil
       OR NEW.decision_detail IS DISTINCT FROM OLD.decision_detail
       OR NEW.pdf_hash IS DISTINCT FROM OLD.pdf_hash
       OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path
       OR NEW.locked IS DISTINCT FROM OLD.locked
       OR NEW.version IS DISTINCT FROM OLD.version THEN
      RAISE EXCEPTION 'Bulletin verrouille : modification impossible (version %)', OLD.version;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_locked_bulletin
  BEFORE UPDATE ON public.bulletins_audit
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_bulletin();

-- 2) RPC : upsert un brouillon (incrémente version si verrouillé existant)
CREATE OR REPLACE FUNCTION public.upsert_bulletin_audit(
  _ecole_id uuid, _annee_id uuid, _periode_id uuid, _classe_id uuid, _eleve_id uuid,
  _moyenne numeric, _rang int, _mention text,
  _appreciation_generale text, _decision_conseil text, _decision_detail text,
  _override_motif text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.bulletins_audit%ROWTYPE;
  v_id uuid;
  v_new_version int := 1;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'enseignant'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  SELECT * INTO v_existing FROM public.bulletins_audit
   WHERE ecole_id = _ecole_id AND periode_id = _periode_id
     AND classe_id = _classe_id AND eleve_id = _eleve_id
   ORDER BY version DESC LIMIT 1;

  IF FOUND AND v_existing.locked = false THEN
    UPDATE public.bulletins_audit SET
      moyenne = _moyenne, rang = _rang, mention = _mention,
      appreciation_generale = _appreciation_generale,
      decision_conseil = _decision_conseil,
      decision_detail = _decision_detail,
      override_by = CASE WHEN _override_motif IS NOT NULL THEN auth.uid() ELSE override_by END,
      override_at = CASE WHEN _override_motif IS NOT NULL THEN now() ELSE override_at END,
      override_motif = COALESCE(_override_motif, override_motif)
    WHERE id = v_existing.id
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  IF FOUND AND v_existing.locked = true THEN
    v_new_version := v_existing.version + 1;
  END IF;

  INSERT INTO public.bulletins_audit (
    ecole_id, annee_id, periode_id, classe_id, eleve_id, version,
    moyenne, rang, mention,
    appreciation_generale, decision_conseil, decision_detail,
    override_by, override_at, override_motif
  ) VALUES (
    _ecole_id, _annee_id, _periode_id, _classe_id, _eleve_id, v_new_version,
    _moyenne, _rang, _mention,
    _appreciation_generale, _decision_conseil, _decision_detail,
    CASE WHEN _override_motif IS NOT NULL THEN auth.uid() ELSE NULL END,
    CASE WHEN _override_motif IS NOT NULL THEN now() ELSE NULL END,
    _override_motif
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 3) RPC : verrouille un bulletin (admin/directeur uniquement)
CREATE OR REPLACE FUNCTION public.verrouiller_bulletin(_id uuid, _pdf_hash text, _pdf_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ecole uuid; v_locked boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT ecole_id, locked INTO v_ecole, v_locked FROM public.bulletins_audit WHERE id = _id;
  IF v_ecole IS NULL THEN RAISE EXCEPTION 'Bulletin introuvable'; END IF;
  IF v_locked THEN RAISE EXCEPTION 'Bulletin deja verrouille'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), v_ecole, 'admin'::app_role)
          OR private.has_ecole_role(auth.uid(), v_ecole, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'Acces refuse : admin/directeur requis pour verrouiller';
  END IF;

  UPDATE public.bulletins_audit
     SET locked = true, locked_at = now(), locked_by = auth.uid(),
         pdf_hash = COALESCE(_pdf_hash, pdf_hash),
         pdf_path = COALESCE(_pdf_path, pdf_path)
   WHERE id = _id;

  PERFORM public.log_security_event(
    'bulletin_verrouille', 'info', v_ecole, NULL, NULL, NULL,
    jsonb_build_object('bulletin_id', _id)
  );
END;
$$;

-- 4) RPC : trace l'envoi (compatible bulletin verrouille via SECURITY DEFINER + champ autorise)
CREATE OR REPLACE FUNCTION public.tracer_envoi_bulletin(
  _id uuid, _channels jsonb, _recipients jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ecole uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT ecole_id INTO v_ecole FROM public.bulletins_audit WHERE id = _id;
  IF v_ecole IS NULL THEN RAISE EXCEPTION 'Bulletin introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND ecole_id = v_ecole) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  UPDATE public.bulletins_audit
     SET sent_channels = COALESCE(_channels, sent_channels),
         sent_recipients = COALESCE(_recipients, sent_recipients),
         sent_at = now(),
         sent_by = auth.uid()
   WHERE id = _id;
END;
$$;

-- 5) Storage bucket privé pour les PDFs archivés
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulletins', 'bulletins', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques storage : membres de l'école (chemin : <ecole_id>/<eleve_id>/<file>)
CREATE POLICY "bulletins_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bulletins'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.ecole_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "bulletins_storage_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bulletins'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.ecole_id::text = (storage.foldername(name))[1]
        AND ur.role IN ('admin'::app_role,'directeur'::app_role,'enseignant'::app_role)
    )
  );
