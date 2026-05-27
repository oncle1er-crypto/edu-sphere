
-- ============================================================
-- 1. Catalogue des modules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_modules (
  key text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_modules TO authenticated, anon;
GRANT ALL ON public.app_modules TO service_role;

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_read_all" ON public.app_modules FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.app_modules (key, label, icon, ordre) VALUES
  ('eleves', 'Élèves', 'Users', 10),
  ('classes', 'Classes', 'BookOpen', 20),
  ('enseignants', 'Enseignants', 'GraduationCap', 30),
  ('matieres', 'Matières', 'BookCopy', 40),
  ('emploi_temps', 'Emploi du temps', 'CalendarClock', 50),
  ('examens', 'Examens & Notes', 'ClipboardList', 60),
  ('presences', 'Présences', 'CheckSquare', 70),
  ('finances', 'Finances', 'CreditCard', 80),
  ('bibliotheque', 'Bibliothèque', 'Library', 90),
  ('cantine', 'Cantine', 'UtensilsCrossed', 100),
  ('transport', 'Transport', 'Bus', 110),
  ('cartes', 'Cartes & Badges', 'IdCard', 120),
  ('communication', 'Communication', 'MessageSquare', 130),
  ('statistiques', 'Statistiques', 'BarChart3', 140),
  ('ecoles', 'Écoles', 'School', 150),
  ('parametres', 'Paramètres', 'Settings', 160)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, ordre = EXCLUDED.ordre;

-- ============================================================
-- 2. Permissions par utilisateur
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ecole_id uuid NOT NULL,
  module_key text NOT NULL REFERENCES public.app_modules(key) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ecole_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id, ecole_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perm_read_self_or_admin" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
  );

CREATE POLICY "perm_write_admin" ON public.user_permissions
  FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role));

CREATE TRIGGER trg_user_permissions_updated
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. Fonction de vérification
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid, _ecole_id uuid, _module text, _action text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF _user_id IS NULL OR _ecole_id IS NULL THEN RETURN false; END IF;

  -- Admin école : tout autorisé
  IF private.has_ecole_role(_user_id, _ecole_id, 'admin'::public.app_role) THEN
    RETURN true;
  END IF;

  SELECT CASE _action
    WHEN 'view'   THEN can_view
    WHEN 'create' THEN can_create
    WHEN 'update' THEN can_update
    WHEN 'delete' THEN can_delete
    WHEN 'export' THEN can_export
    ELSE false
  END
  INTO v_allowed
  FROM public.user_permissions
  WHERE user_id = _user_id AND ecole_id = _ecole_id AND module_key = _module;

  RETURN COALESCE(v_allowed, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, uuid, text, text) TO authenticated, anon;

-- ============================================================
-- 4. Upsert bulk admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_permissions(
  _target_user uuid, _ecole_id uuid, _permissions jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_item jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  -- _permissions = [{module:'eleves', view:true, create:false, update:false, delete:false, export:false}, ...]
  FOR v_item IN SELECT * FROM jsonb_array_elements(_permissions) LOOP
    INSERT INTO public.user_permissions (
      user_id, ecole_id, module_key,
      can_view, can_create, can_update, can_delete, can_export, granted_by
    ) VALUES (
      _target_user, _ecole_id, v_item->>'module',
      COALESCE((v_item->>'view')::boolean, false),
      COALESCE((v_item->>'create')::boolean, false),
      COALESCE((v_item->>'update')::boolean, false),
      COALESCE((v_item->>'delete')::boolean, false),
      COALESCE((v_item->>'export')::boolean, false),
      auth.uid()
    )
    ON CONFLICT (user_id, ecole_id, module_key) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_update = EXCLUDED.can_update,
      can_delete = EXCLUDED.can_delete,
      can_export = EXCLUDED.can_export,
      granted_by = auth.uid(),
      updated_at = now();
  END LOOP;

  PERFORM public.log_security_event(
    'user_permissions_updated', 'info', _ecole_id, NULL, NULL, NULL,
    jsonb_build_object('target_user', _target_user, 'count', jsonb_array_length(_permissions))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_permissions(uuid, uuid, jsonb) TO authenticated;

-- ============================================================
-- 5. Enseignants : colonnes pour compte + invitation
-- ============================================================
ALTER TABLE public.enseignants
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_enseignants_user_id ON public.enseignants(user_id);

-- ============================================================
-- 6. Invitations enseignants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id uuid NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  ecole_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  email text,
  telephone text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_inv_enseignant ON public.teacher_invitations(enseignant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_invitations TO authenticated;
GRANT ALL ON public.teacher_invitations TO service_role;

ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_admin_read" ON public.teacher_invitations
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role));

CREATE POLICY "inv_admin_write" ON public.teacher_invitations
  FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role));

-- ============================================================
-- 7. Consommer une invitation (appelée depuis edge function avec service_role)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_teacher_invitation(_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv public.teacher_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.teacher_invitations
  WHERE token_hash = _token_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_inv.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;
  IF v_inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  UPDATE public.teacher_invitations SET consumed_at = now() WHERE id = v_inv.id;
  UPDATE public.enseignants SET invitation_accepted_at = now() WHERE id = v_inv.enseignant_id;

  PERFORM public.log_security_event(
    'teacher_invitation_consumed', 'info', v_inv.ecole_id, NULL, NULL, NULL,
    jsonb_build_object('enseignant_id', v_inv.enseignant_id, 'user_id', v_inv.user_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_inv.user_id,
    'email', v_inv.email,
    'enseignant_id', v_inv.enseignant_id,
    'ecole_id', v_inv.ecole_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_teacher_invitation(text) TO authenticated, anon, service_role;
