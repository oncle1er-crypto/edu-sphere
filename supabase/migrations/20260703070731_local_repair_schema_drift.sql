-- =====================================================================
-- MIGRATION DE RÉPARATION — dérive de schéma (schema drift)
-- =====================================================================
-- Contexte
-- --------
-- Un ensemble d'objets existe en production mais n'a JAMAIS été versionné :
-- ils ont été créés directement via l'éditeur SQL Supabase / Lovable. Une
-- reconstruction depuis une base vierge échouait donc, et le module SIGFNE
-- était totalement absent en local.
--
-- Objets concernés :
--   * tables     : parametres_sigfne, zindua_config
--   * colonnes   : eleves.statut_sigfne, eleves.sigfne_verifie_le
--   * extension  : unaccent (schéma public)
--   * fonctions  : normaliser_etat_civil, matricule_valide,
--                  stats_conformite_sigfne, import_matricules_sigfne,
--                  trg_eleves_sigfne
--   * vues       : v_conformite_sigfne, v_export_sigfne_eleves
--   * trigger    : eleves_sigfne sur public.eleves
--   * policies   : zindua_config_lecture, zindua_config_ecriture
--
-- Dépendances qui imposent cette position (juste avant 20260703070732) :
--   20260703070732 fait ALTER FUNCTION sur les 5 fonctions ci-dessus
--   20260708104439 crée les policies de parametres_sigfne
--   20260807110548 fait ALTER TABLE sur zindua_config
--
-- Provenance
-- ----------
-- Définitions extraites LE 2026-08-07 de la base de production
-- (yvsnokvgxqtpqkuizsfo) en LECTURE SEULE, via les catalogues système
-- (pg_get_functiondef, pg_get_viewdef, pg_get_triggerdef, pg_get_constraintdef,
-- information_schema). Aucune donnée métier n'a été lue, aucune écriture
-- n'a été effectuée sur la production.
--
-- Effet sur la production
-- -----------------------
-- NUL. Tables, colonnes, extension, trigger et policies sont créés
-- conditionnellement ; les fonctions et vues sont en CREATE OR REPLACE avec
-- la définition exacte déjà en place. Rejouer ce fichier en production ne
-- modifie ni le schéma ni les données.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Extension requise par normaliser_etat_civil
--    En production, unaccent est installée dans le schéma public.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- ---------------------------------------------------------------------
-- 1) parametres_sigfne : paramètres de conformité SIGFNE par école
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parametres_sigfne (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id           uuid NOT NULL,
  code_etablissement text,
  drena              text,
  regex_matricule    text NOT NULL DEFAULT '^[0-9]{8}[A-Z]$',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parametres_sigfne_pkey        PRIMARY KEY (id),
  CONSTRAINT parametres_sigfne_ecole_id_key UNIQUE (ecole_id),
  CONSTRAINT parametres_sigfne_ecole_id_fkey
    FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

ALTER TABLE public.parametres_sigfne ENABLE ROW LEVEL SECURITY;
-- Les policies sigfne_read / sigfne_write sont créées par 20260708104439.

-- ---------------------------------------------------------------------
-- 2) zindua_config : configuration du fournisseur WhatsApp/SMS Zindua
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zindua_config (
  id                      uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id                uuid NOT NULL,
  enabled                 boolean NOT NULL DEFAULT false,
  whatsapp_enabled        boolean NOT NULL DEFAULT false,
  email_enabled           boolean NOT NULL DEFAULT false,
  auto_send_enabled       boolean NOT NULL DEFAULT false,
  test_mode               boolean NOT NULL DEFAULT true,
  test_destinataires      text[] NOT NULL DEFAULT '{}'::text[],
  template_otp            text NOT NULL DEFAULT 'otp-verification',
  intervalle_min_secondes integer NOT NULL DEFAULT 15,
  quota_mensuel           integer NOT NULL DEFAULT 200,
  api_base_url            text NOT NULL DEFAULT 'https://zindua.run/api/v1',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  template_recu           text DEFAULT 'recu-paiement',
  envoi_auto_recu         boolean NOT NULL DEFAULT true,
  CONSTRAINT zindua_config_pkey        PRIMARY KEY (id),
  CONSTRAINT zindua_config_ecole_unique UNIQUE (ecole_id),
  CONSTRAINT zindua_intervalle_min      CHECK (intervalle_min_secondes >= 15),
  CONSTRAINT zindua_config_ecole_id_fkey
    FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);
-- template_test / template_relance / template_echeance / template_bulletin
-- sont ajoutées par 20260807110548 (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.zindua_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='zindua_config'
                   AND policyname='zindua_config_lecture') THEN
    CREATE POLICY zindua_config_lecture ON public.zindua_config
      FOR SELECT
      USING (
        private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
        OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='zindua_config'
                   AND policyname='zindua_config_ecriture') THEN
    CREATE POLICY zindua_config_ecriture ON public.zindua_config
      FOR ALL
      USING (
        private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
        OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
      )
      WITH CHECK (
        private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
        OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) Colonnes SIGFNE sur public.eleves
-- ---------------------------------------------------------------------
ALTER TABLE public.eleves
  ADD COLUMN IF NOT EXISTS statut_sigfne    text NOT NULL DEFAULT 'non_verifie',
  ADD COLUMN IF NOT EXISTS sigfne_verifie_le timestamptz;

-- ---------------------------------------------------------------------
-- 4) Fonctions utilitaires SIGFNE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normaliser_etat_civil(txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select upper(trim(regexp_replace(public.unaccent(coalesce(txt,'')), '\s+', ' ', 'g')));
$function$;

CREATE OR REPLACE FUNCTION public.matricule_valide(p_ecole_id uuid, p_matricule text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_regex text;
begin
  if p_matricule is null or length(trim(p_matricule)) = 0 then
    return false;
  end if;
  select regex_matricule into v_regex
  from public.parametres_sigfne where ecole_id = p_ecole_id;
  return upper(trim(p_matricule)) ~ coalesce(v_regex, '^[0-9]{8}[A-Z]$');
end;
$function$;

-- ---------------------------------------------------------------------
-- 5) Vues de conformité et d'export
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_conformite_sigfne AS
 SELECT e.ecole_id,
    e.id AS eleve_id,
    e.matricule,
    e.matricule_national,
    e.nom,
    e.prenom,
    e.classe_id,
    c.nom AS classe,
    e.statut_sigfne,
        CASE
            WHEN e.matricule_national IS NULL THEN 'Matricule national manquant'::text
            WHEN NOT public.matricule_valide(e.ecole_id, e.matricule_national) THEN 'Format de matricule invalide'::text
            WHEN e.date_naissance IS NULL THEN 'Date de naissance manquante'::text
            WHEN e.lieu_naissance IS NULL OR TRIM(BOTH FROM e.lieu_naissance) = ''::text THEN 'Lieu de naissance manquant'::text
            WHEN e.sexe IS NULL THEN 'Sexe non renseigné'::text
            ELSE 'Conforme'::text
        END AS diagnostic,
    count(*) OVER (PARTITION BY e.ecole_id, e.matricule_national) > 1 AND e.matricule_national IS NOT NULL AS doublon_matricule,
    e.annee_id
   FROM public.eleves e
     LEFT JOIN public.classes c ON c.id = e.classe_id;

CREATE OR REPLACE VIEW public.v_export_sigfne_eleves AS
 SELECT e.ecole_id,
    p.code_etablissement,
    p.drena,
    e.matricule_national AS "MATRICULE",
    public.normaliser_etat_civil(e.nom) AS "NOM",
    public.normaliser_etat_civil(e.prenom) AS "PRENOMS",
    to_char(e.date_naissance::timestamp with time zone, 'DD/MM/YYYY'::text) AS "DATE_NAISSANCE",
    public.normaliser_etat_civil(e.lieu_naissance) AS "LIEU_NAISSANCE",
    e.sexe::text AS "SEXE",
    COALESCE(upper(e.nationalite), 'IVOIRIENNE'::text) AS "NATIONALITE",
    c.nom AS "CLASSE",
    e.annee_id
   FROM public.eleves e
     LEFT JOIN public.classes c ON c.id = e.classe_id
     LEFT JOIN public.parametres_sigfne p ON p.ecole_id = e.ecole_id
  WHERE e.statut_sigfne = 'conforme'::text;

-- ---------------------------------------------------------------------
-- 6) Statistiques de conformité (dépend de v_conformite_sigfne)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stats_conformite_sigfne(p_ecole_id uuid)
 RETURNS TABLE(total bigint, conformes bigint, sans_matricule bigint, anomalies bigint, doublons bigint, taux_conformite numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    count(*),
    count(*) filter (where statut_sigfne = 'conforme'),
    count(*) filter (where statut_sigfne = 'sans_matricule'),
    count(*) filter (where statut_sigfne = 'anomalie'),
    count(*) filter (where doublon_matricule),
    round(100.0 * count(*) filter (where statut_sigfne = 'conforme') / greatest(count(*),1), 1)
  from public.v_conformite_sigfne
  where ecole_id = p_ecole_id;
$function$;

-- ---------------------------------------------------------------------
-- 7) Import en masse des matricules nationaux
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_matricules_sigfne(p_ecole_id uuid, p_rows jsonb, p_dry_run boolean DEFAULT true)
 RETURNS TABLE(ligne integer, matricule_national text, eleve_id uuid, eleve_nom text, resultat text, detail text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_idx int := 0;
  v_eid uuid;
  v_enom text;
  v_count int;
  v_mn text;
begin
  create temp table if not exists _rapport (
    r_ligne int, r_mn text, r_eleve_id uuid,
    r_eleve_nom text, r_resultat text, r_detail text
  ) on commit drop;
  truncate _rapport;

  for r in select * from jsonb_to_recordset(p_rows) as x(
    matricule text, matricule_national text, nom text,
    prenom text, date_naissance date, lieu_naissance text
  )
  loop
    v_idx := v_idx + 1;
    v_eid := null; v_enom := null;
    v_mn := nullif(upper(trim(coalesce(r.matricule_national,''))), '');

    if v_mn is null then
      insert into _rapport values (v_idx, null, null, null, 'erreur', 'Matricule national vide');
      continue;
    end if;

    if exists (select 1 from _rapport t where t.r_mn = v_mn and t.r_resultat = 'ok') then
      insert into _rapport values (v_idx, v_mn, null, null, 'doublon_fichier',
        'Ce matricule apparaît plusieurs fois dans le fichier');
      continue;
    end if;

    select e.id, e.nom || ' ' || e.prenom into v_eid, v_enom
    from public.eleves e
    where e.ecole_id = p_ecole_id and e.matricule_national = v_mn;
    if v_eid is not null then
      insert into _rapport values (v_idx, v_mn, v_eid, v_enom, 'conflit_base',
        'Matricule déjà attribué à cet élève en base');
      continue;
    end if;

    if nullif(trim(coalesce(r.matricule,'')), '') is not null then
      select e.id, e.nom || ' ' || e.prenom into v_eid, v_enom
      from public.eleves e
      where e.ecole_id = p_ecole_id and e.matricule = trim(r.matricule);
    end if;

    if v_eid is null and r.nom is not null and r.prenom is not null then
      select count(*) into v_count
      from public.eleves e
      where e.ecole_id = p_ecole_id
        and public.normaliser_etat_civil(e.nom) = public.normaliser_etat_civil(r.nom)
        and public.normaliser_etat_civil(e.prenom) = public.normaliser_etat_civil(r.prenom)
        and (r.date_naissance is null or e.date_naissance = r.date_naissance);
      if v_count = 1 then
        select e.id, e.nom || ' ' || e.prenom into v_eid, v_enom
        from public.eleves e
        where e.ecole_id = p_ecole_id
          and public.normaliser_etat_civil(e.nom) = public.normaliser_etat_civil(r.nom)
          and public.normaliser_etat_civil(e.prenom) = public.normaliser_etat_civil(r.prenom)
          and (r.date_naissance is null or e.date_naissance = r.date_naissance);
      elsif v_count > 1 then
        insert into _rapport values (v_idx, v_mn, null, r.nom || ' ' || r.prenom,
          'ambigu', v_count || ' élèves correspondent — précisez le matricule interne ou la date de naissance');
        continue;
      end if;
    end if;

    if v_eid is null then
      insert into _rapport values (v_idx, v_mn, null,
        coalesce(r.nom || ' ' || r.prenom, ''), 'non_trouve', 'Aucun élève correspondant');
      continue;
    end if;

    if not p_dry_run then
      begin
        update public.eleves e set
          matricule_national = v_mn,
          lieu_naissance = coalesce(nullif(trim(r.lieu_naissance),''), e.lieu_naissance),
          date_naissance = coalesce(r.date_naissance, e.date_naissance)
        where e.id = v_eid;
      exception when others then
        insert into _rapport values (v_idx, v_mn, v_eid, v_enom, 'erreur', SQLERRM);
        continue;
      end;
    end if;

    insert into _rapport values (v_idx, v_mn, v_eid, v_enom, 'ok',
      case when p_dry_run then 'Simulation — sera mis à jour' else 'Mis à jour' end);
  end loop;

  return query
    select t.r_ligne, t.r_mn, t.r_eleve_id, t.r_eleve_nom, t.r_resultat, t.r_detail
    from _rapport t order by t.r_ligne;
end;
$function$;

-- ---------------------------------------------------------------------
-- 8) Trigger de qualification automatique du statut SIGFNE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_eleves_sigfne()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.matricule_national := nullif(upper(trim(coalesce(new.matricule_national,''))), '');

  if new.matricule_national is null then
    new.statut_sigfne := 'sans_matricule';
    new.sigfne_verifie_le := null;
  elsif not public.matricule_valide(new.ecole_id, new.matricule_national)
     or new.date_naissance is null
     or new.sexe is null
     or new.lieu_naissance is null or trim(new.lieu_naissance) = '' then
    new.statut_sigfne := 'anomalie';
    new.sigfne_verifie_le := null;
  else
    new.statut_sigfne := 'conforme';
    new.sigfne_verifie_le := now();
  end if;

  return new;
end;
$function$;

-- Création conditionnelle : garantit un no-op strict en production, où le
-- trigger existe déjà (pas de DROP/CREATE qui rouvrirait une fenêtre sans
-- contrôle sur une table active).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname = 'public'
      AND c.relname = 'eleves' AND t.tgname = 'eleves_sigfne'
  ) THEN
    CREATE TRIGGER eleves_sigfne
      BEFORE INSERT OR UPDATE ON public.eleves
      FOR EACH ROW EXECUTE FUNCTION public.trg_eleves_sigfne();
  END IF;
END $$;
