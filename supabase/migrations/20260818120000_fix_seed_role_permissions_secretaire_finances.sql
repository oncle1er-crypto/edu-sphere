-- Corrige un défaut root-cause découvert lors d'un `supabase db reset` complet
-- (base vierge, ordre : migrations d'abord, puis supabase/seed.sql en dernier) :
-- la migration 20260817083000_depenses_secretaire_brouillons.sql peuple
-- role_permissions pour (secretaire, finances.depenses) et
-- (secretaire, finances.bilan_rapports) via
--   INSERT INTO role_permissions (...) SELECT id, ... FROM public.ecoles
-- — or au moment où cette migration s'exécute, public.ecoles est encore
-- vide (seed.sql, qui insère les écoles, ne s'exécute qu'après TOUTES les
-- migrations). Résultat observé après reset : app_modules contient bien les
-- deux clés, mais role_permissions n'a aucune ligne secretaire pour elles
-- — la secrétaire ne verrait donc ni Dépenses ni Bilan/Rapports sur un
-- environnement rejoué à froid (CI, nouveau poste, disaster recovery),
-- alors que la fonctionnalité semblait "marcher" en local uniquement parce
-- que la base locale avait déjà des écoles depuis une synchronisation prod
-- antérieure à l'ajout de cette migration.
--
-- Le mécanisme existant et déjà éprouvé pour ce genre de provisioning est
-- seed_role_permissions_for_ecole(_ecole_id) + le trigger
-- trg_seed_role_permissions (AFTER INSERT ON ecoles) — cf. migration
-- 20260720111612. Il exclut volontairement les clés contenant un point
-- (modules "avancés", opt-in, pas de défaut automatique pour tous les
-- rôles). On étend cette fonction avec un bloc dédié, explicite, limité au
-- seul rôle secretaire et à ces deux clés précises — les autres clés à
-- point restent inchangées pour tous les autres rôles. Ainsi :
--   - toute future école (via le trigger) reçoit automatiquement ces deux
--     lignes, quel que soit l'ordre migrations/seed ;
--   - le backfill ci-dessous couvre les écoles déjà existantes (idempotent,
--     ON CONFLICT DO NOTHING, sans effet sur la production où ces lignes
--     existent déjà via la migration du 17/08).

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

  -- Bloc ajouté (18/08/2026) : accès scindé secretaire sur les deux
  -- modules à point introduits le 17/08, non couverts par la boucle
  -- ci-dessus (motif "%.%" exclu volontairement pour les autres rôles).
  INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
  VALUES (_ecole_id, 'secretaire'::public.app_role, 'finances.depenses', true, true, true, false, false)
  ON CONFLICT (ecole_id, role, module_key) DO NOTHING;

  INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
  VALUES (_ecole_id, 'secretaire'::public.app_role, 'finances.bilan_rapports', true, false, false, false, true)
  ON CONFLICT (ecole_id, role, module_key) DO NOTHING;
END $$;

-- Backfill pour les écoles déjà existantes (no-op en prod, où ces lignes
-- existent déjà depuis la migration du 17/08 ; répare les environnements
-- rejoués à froid où elles manquaient).
DO $$
DECLARE eco RECORD;
BEGIN
  FOR eco IN SELECT id FROM public.ecoles LOOP
    PERFORM public.seed_role_permissions_for_ecole(eco.id);
  END LOOP;
END $$;
