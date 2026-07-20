CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  module_key text NOT NULL REFERENCES public.app_modules(key) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, role, module_key)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_read_same_ecole"
ON public.role_permissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.ecole_id = role_permissions.ecole_id));

CREATE POLICY "role_permissions_write_admin"
ON public.role_permissions FOR ALL TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::public.app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::public.app_role)
);

CREATE TRIGGER trg_role_permissions_updated
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.app_modules (key, label, ordre) VALUES
  ('finances.comptabilite', 'Finances — Comptabilité (Grand livre)', 101),
  ('finances.relances', 'Finances — Relances & SMS', 102),
  ('finances.suppression_paiement', 'Finances — Suppression de paiement', 103),
  ('eleves.suppression', 'Élèves — Suppression', 201),
  ('eleves.reinscription', 'Élèves — Réinscriptions', 202),
  ('classes.affectation', 'Classes — Affectation élèves', 301),
  ('examens.saisie_notes', 'Examens — Saisie des notes', 401),
  ('examens.bulletins', 'Examens — Génération bulletins', 402),
  ('parametres.zone_dangereuse', 'Paramètres — Zone dangereuse', 901),
  ('parametres.utilisateurs', 'Paramètres — Utilisateurs & Rôles', 902)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid, _ecole_id uuid)
RETURNS TABLE (module_key text, can_view boolean, can_create boolean, can_update boolean, can_delete boolean, can_export boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH role_perms AS (
    SELECT rp.module_key,
           bool_or(rp.can_view) AS can_view, bool_or(rp.can_create) AS can_create,
           bool_or(rp.can_update) AS can_update, bool_or(rp.can_delete) AS can_delete,
           bool_or(rp.can_export) AS can_export
    FROM public.role_permissions rp
    JOIN public.user_roles ur ON ur.role = rp.role AND ur.ecole_id = rp.ecole_id
    WHERE ur.user_id = _user_id AND ur.ecole_id = _ecole_id
    GROUP BY rp.module_key
  ),
  user_perms AS (
    SELECT up.module_key, up.can_view, up.can_create, up.can_update, up.can_delete, up.can_export
    FROM public.user_permissions up
    WHERE up.user_id = _user_id AND up.ecole_id = _ecole_id
  )
  SELECT m.key,
         COALESCE(u.can_view, r.can_view, false),
         COALESCE(u.can_create, r.can_create, false),
         COALESCE(u.can_update, r.can_update, false),
         COALESCE(u.can_delete, r.can_delete, false),
         COALESCE(u.can_export, r.can_export, false)
  FROM public.app_modules m
  LEFT JOIN role_perms r ON r.module_key = m.key
  LEFT JOIN user_perms u ON u.module_key = m.key
  WHERE r.module_key IS NOT NULL OR u.module_key IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_permissions(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_role_permissions(_ecole_id uuid, _role public.app_role, _permissions jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE perm jsonb;
BEGIN
  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::public.app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé : admin ou directeur requis';
  END IF;
  DELETE FROM public.role_permissions WHERE ecole_id = _ecole_id AND role = _role;
  FOR perm IN SELECT * FROM jsonb_array_elements(_permissions) LOOP
    INSERT INTO public.role_permissions (
      ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export, updated_by
    ) VALUES (
      _ecole_id, _role, perm->>'module',
      COALESCE((perm->>'view')::boolean, false),
      COALESCE((perm->>'create')::boolean, false),
      COALESCE((perm->>'update')::boolean, false),
      COALESCE((perm->>'delete')::boolean, false),
      COALESCE((perm->>'export')::boolean, false),
      auth.uid()
    );
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.set_role_permissions(uuid, public.app_role, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_role_permissions_for_ecole(_ecole_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  mod RECORD; r text;
  defaults jsonb := '{
    "admin": ["*"],
    "directeur": ["eleves","classes","examens","presences","vie_scolaire","cours_vacances","parametres","transport","cantine","bibliotheque","statistiques","communication","cartes","enseignants","matieres","emploi_du_temps","finances"],
    "enseignant": ["examens","presences","classes","matieres"],
    "educateur": ["vie_scolaire","presences","eleves"],
    "comptable": ["finances","eleves","cours_vacances","statistiques"],
    "secretaire": ["eleves","classes","vie_scolaire","communication","cartes"],
    "surveillant": ["presences","eleves"],
    "parent": ["eleves","examens"]
  }'::jsonb;
  full_roles text[] := ARRAY['admin','directeur','comptable']::text[];
BEGIN
  FOR r IN SELECT jsonb_object_keys(defaults) LOOP
    FOR mod IN SELECT key FROM public.app_modules WHERE key NOT LIKE '%.%' LOOP
      IF (defaults->r) ? '*' OR (defaults->r) ? mod.key THEN
        INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
        VALUES (
          _ecole_id, r::public.app_role, mod.key,
          true,
          r = ANY(full_roles) OR r IN ('secretaire','enseignant','educateur','surveillant'),
          r = ANY(full_roles) OR r IN ('secretaire','enseignant','educateur'),
          r = ANY(full_roles),
          r = ANY(full_roles) OR r = 'comptable'
        )
        ON CONFLICT (ecole_id, role, module_key) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

DO $$
DECLARE eco RECORD;
BEGIN
  FOR eco IN SELECT id FROM public.ecoles LOOP
    PERFORM public.seed_role_permissions_for_ecole(eco.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_seed_role_permissions_on_ecole()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN PERFORM public.seed_role_permissions_for_ecole(NEW.id); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_seed_role_permissions ON public.ecoles;
CREATE TRIGGER trg_seed_role_permissions
AFTER INSERT ON public.ecoles
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_role_permissions_on_ecole();