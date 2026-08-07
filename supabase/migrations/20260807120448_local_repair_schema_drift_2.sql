-- =====================================================================
-- MIGRATION DE RÉPARATION #2 — dérive de schéma (suite)
-- =====================================================================
-- Complète 20260703070731. Objets présents en production mais absents de
-- toute migration (créés directement via l'éditeur SQL Supabase / Lovable) :
--
--   * 30 colonnes manquantes sur 5 tables existantes
--   * 7 tables du module RH / paie  (rh_*)
--   * 7 vues d'analyse financière   (v_*)
--   * 20 fonctions                  (budget, paie, encaissements, garde-fous)
--   * 10 triggers de cohérence métier
--   * les index correspondants
--
-- Position en fin de chaîne : aucune migration antérieure ne référence ces
-- objets (la reconstruction passait déjà sans eux), et toutes les tables de
-- base existent à ce stade.
--
-- Provenance
-- ----------
-- Définitions extraites LE 2026-08-07 de la base de production
-- (yvsnokvgxqtpqkuizsfo) en LECTURE SEULE via les catalogues système
-- (pg_get_functiondef, pg_get_viewdef, pg_get_triggerdef,
-- pg_get_constraintdef, pg_get_expr, pg_indexes, information_schema).
-- Aucune donnée métier n'a été lue. Aucune écriture n'a été effectuée.
--
-- Effet sur la production
-- -----------------------
-- NUL. Colonnes, tables, index, policies et triggers sont créés
-- conditionnellement ; fonctions et vues sont en CREATE OR REPLACE avec la
-- définition exacte déjà en place.
-- =====================================================================

-- =====================================================================
-- A) COLONNES MANQUANTES SUR DES TABLES EXISTANTES
-- =====================================================================

ALTER TABLE public.eleves
  ADD COLUMN IF NOT EXISTS numero_extrait_naissance text;

ALTER TABLE public.enseignants
  ADD COLUMN IF NOT EXISTS poste                  text,
  ADD COLUMN IF NOT EXISTS service                text,
  ADD COLUMN IF NOT EXISTS fonction               text,
  ADD COLUMN IF NOT EXISTS departement            text    NOT NULL DEFAULT 'enseignant',
  ADD COLUMN IF NOT EXISTS nationalite            text             DEFAULT 'Ivoirienne',
  ADD COLUMN IF NOT EXISTS situation_matrimoniale text,
  ADD COLUMN IF NOT EXISTS personne_a_prevenir    text,
  ADD COLUMN IF NOT EXISTS numero_cnps            text,
  ADD COLUMN IF NOT EXISTS numero_cmu             text,
  ADD COLUMN IF NOT EXISTS parts_fiscales         numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS banque                 text,
  ADD COLUMN IF NOT EXISTS rib                    text,
  ADD COLUMN IF NOT EXISTS salaire_brut_base      numeric NOT NULL DEFAULT 0;

ALTER TABLE public.bulletins_paie
  ADD COLUMN IF NOT EXISTS total_gains              numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brut_imposable           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_cnps                numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_charges_patronales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cout_employeur           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anciennete_annees        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valide_le                timestamptz,
  ADD COLUMN IF NOT EXISTS valide_par               uuid,
  ADD COLUMN IF NOT EXISTS depense_id               uuid,
  ADD COLUMN IF NOT EXISTS notes                    text;

ALTER TABLE public.lignes_budget
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.sms_logs
  ADD COLUMN IF NOT EXISTS provider        text NOT NULL DEFAULT 'yellikasms',
  ADD COLUMN IF NOT EXISTS provider_log_id text,
  ADD COLUMN IF NOT EXISTS template_slug   text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS error_code      text;

-- Index associés (dont l'unique partiel requis par le ON CONFLICT de
-- generer_budget_previsionnel).
CREATE UNIQUE INDEX IF NOT EXISTS lignes_budget_source_unique
  ON public.lignes_budget USING btree (ecole_id, annee_id, source) WHERE (source IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS sms_logs_idempotency_unique
  ON public.sms_logs USING btree (ecole_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS sms_logs_canal_idx
  ON public.sms_logs USING btree (canal);
CREATE INDEX IF NOT EXISTS sms_logs_provider_created_idx
  ON public.sms_logs USING btree (ecole_id, provider, canal, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_eleves_matricule_national_ecole
  ON public.eleves USING btree (ecole_id, matricule_national) WHERE (matricule_national IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_eleves_frais_override
  ON public.eleves USING btree (frais_id_override);

-- =====================================================================
-- B) MODULE RH / PAIE — 7 tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.rh_parametres (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id   uuid NOT NULL,
  groupe     text NOT NULL,
  cle        text NOT NULL,
  libelle    text NOT NULL,
  valeur     numeric NOT NULL DEFAULT 0,
  unite      text NOT NULL DEFAULT 'pourcentage',
  ordre      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  valeur_texte text,
  CONSTRAINT rh_parametres_pkey PRIMARY KEY (id),
  CONSTRAINT rh_parametres_unique UNIQUE (ecole_id, cle),
  CONSTRAINT rh_parametres_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.rh_rubriques (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id   uuid NOT NULL,
  code       text NOT NULL,
  libelle    text NOT NULL,
  type       text NOT NULL,
  imposable  boolean NOT NULL DEFAULT false,
  soumis_cnps boolean NOT NULL DEFAULT false,
  systeme    boolean NOT NULL DEFAULT false,
  active     boolean NOT NULL DEFAULT true,
  ordre      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_rubriques_pkey PRIMARY KEY (id),
  CONSTRAINT rh_rubriques_unique UNIQUE (ecole_id, code),
  CONSTRAINT rh_rubriques_type_check CHECK ((type = ANY (ARRAY['gain'::text, 'retenue'::text, 'charge_patronale'::text]))),
  CONSTRAINT rh_rubriques_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.rh_bareme_anciennete (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id   uuid NOT NULL,
  annees_min integer NOT NULL,
  annees_max integer,
  taux       numeric NOT NULL,
  CONSTRAINT rh_bareme_anciennete_pkey PRIMARY KEY (id),
  CONSTRAINT rh_bareme_anc_unique UNIQUE (ecole_id, annees_min),
  CONSTRAINT rh_bareme_anciennete_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.rh_bareme_irpp (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id    uuid NOT NULL,
  tranche_min numeric NOT NULL,
  tranche_max numeric,
  taux        numeric NOT NULL,
  ordre       integer NOT NULL,
  CONSTRAINT rh_bareme_irpp_pkey PRIMARY KEY (id),
  CONSTRAINT rh_bareme_irpp_unique UNIQUE (ecole_id, ordre),
  CONSTRAINT rh_bareme_irpp_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.rh_bulletin_lignes (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id      uuid NOT NULL,
  bulletin_id   uuid NOT NULL,
  rubrique_code text NOT NULL,
  libelle       text NOT NULL,
  type          text NOT NULL,
  base          numeric NOT NULL DEFAULT 0,
  taux          numeric,
  montant       numeric NOT NULL DEFAULT 0,
  ordre         integer NOT NULL DEFAULT 0,
  CONSTRAINT rh_bulletin_lignes_pkey PRIMARY KEY (id),
  CONSTRAINT rh_bulletin_lignes_type_check CHECK ((type = ANY (ARRAY['gain'::text, 'retenue'::text, 'charge_patronale'::text]))),
  CONSTRAINT rh_bulletin_lignes_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE,
  CONSTRAINT rh_bulletin_lignes_bulletin_id_fkey FOREIGN KEY (bulletin_id) REFERENCES public.bulletins_paie(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS rh_bulletin_lignes_bulletin_idx
  ON public.rh_bulletin_lignes USING btree (bulletin_id, type, ordre);

CREATE TABLE IF NOT EXISTS public.rh_departements (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id          uuid NOT NULL,
  code              text NOT NULL,
  libelle           text NOT NULL,
  prefixe_matricule text NOT NULL DEFAULT 'ENS',
  ordre             integer NOT NULL DEFAULT 0,
  active            boolean NOT NULL DEFAULT true,
  CONSTRAINT rh_departements_pkey PRIMARY KEY (id),
  CONSTRAINT rh_departements_unique UNIQUE (ecole_id, code),
  CONSTRAINT rh_departements_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.rh_criteres_evaluation (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  ecole_id    uuid NOT NULL,
  code        text NOT NULL,
  libelle     text NOT NULL,
  note_max    integer NOT NULL DEFAULT 20,
  note_defaut integer NOT NULL DEFAULT 15,
  ordre       integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  CONSTRAINT rh_criteres_evaluation_pkey PRIMARY KEY (id),
  CONSTRAINT rh_criteres_unique UNIQUE (ecole_id, code),
  CONSTRAINT rh_criteres_evaluation_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);

ALTER TABLE public.rh_parametres         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_rubriques          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_bareme_anciennete  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_bareme_irpp        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_bulletin_lignes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_departements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_criteres_evaluation ENABLE ROW LEVEL SECURITY;

-- Policies RH : lecture élargie (admin/directeur/comptable/secrétaire selon la
-- table), écriture réservée à admin/directeur. Reprises telles quelles de la
-- production. Création conditionnelle -> no-op strict en production.
DO $$
DECLARE
  v_gestion  text := 'private.has_ecole_role(auth.uid(), ecole_id, ''admin''::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, ''directeur''::app_role)';
  v_finance  text := 'private.has_ecole_role(auth.uid(), ecole_id, ''admin''::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, ''directeur''::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, ''comptable''::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, ''secretaire''::app_role)';
  v_membre   text := 'private.user_belongs_to_ecole(auth.uid(), ecole_id)';
  r          record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('rh_parametres',          'rh_parametres_lecture',          v_finance),
      ('rh_rubriques',           'rh_rubriques_lecture',           v_finance),
      ('rh_bareme_anciennete',   'rh_bareme_anciennete_lecture',   v_finance),
      ('rh_bareme_irpp',         'rh_bareme_irpp_lecture',         v_finance),
      ('rh_bulletin_lignes',     'rh_bulletin_lignes_lecture',     v_finance),
      ('rh_departements',        'rh_departements_lecture',        v_membre),
      ('rh_criteres_evaluation', 'rh_criteres_evaluation_lecture', v_membre)
    ) AS x(tbl, pol, expr)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname=r.pol) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)', r.pol, r.tbl, r.expr);
    END IF;
  END LOOP;

  FOR r IN
    SELECT * FROM (VALUES
      ('rh_parametres',          'rh_parametres_ecriture'),
      ('rh_rubriques',           'rh_rubriques_ecriture'),
      ('rh_bareme_anciennete',   'rh_bareme_anciennete_ecriture'),
      ('rh_bareme_irpp',         'rh_bareme_irpp_ecriture'),
      ('rh_bulletin_lignes',     'rh_bulletin_lignes_ecriture'),
      ('rh_departements',        'rh_departements_ecriture'),
      ('rh_criteres_evaluation', 'rh_criteres_evaluation_ecriture')
    ) AS x(tbl, pol)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname=r.pol) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (%s) WITH CHECK (%s)', r.pol, r.tbl, v_gestion, v_gestion);
    END IF;
  END LOOP;
END $$;

-- =====================================================================
-- C) FONCTION DE BASE (requise par les vues budgétaires)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.annee_pour_date(_ecole_id uuid, _date date)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT id FROM (
    -- 1. Date comprise dans les bornes d'une annee
    (SELECT id, 1 AS prio, debut FROM annees_scolaires
      WHERE ecole_id = _ecole_id AND _date BETWEEN debut AND fin
      ORDER BY debut LIMIT 1)
    UNION ALL
    -- 2. Sinon : l'annee qui s'ouvre juste apres (inscriptions et vacances d'ete)
    (SELECT id, 2, debut FROM annees_scolaires
      WHERE ecole_id = _ecole_id AND debut > _date AND debut <= _date + INTERVAL '6 months'
      ORDER BY debut LIMIT 1)
    UNION ALL
    -- 3. Sinon : l'annee qui vient de s'achever, si l'ecart reste plausible
    (SELECT id, 3, debut FROM annees_scolaires
      WHERE ecole_id = _ecole_id AND fin < _date AND fin >= _date - INTERVAL '3 months'
      ORDER BY fin DESC LIMIT 1)
  ) c
  ORDER BY prio
  LIMIT 1;
$function$;

-- =====================================================================
-- D) VUES D'ANALYSE
-- =====================================================================

CREATE OR REPLACE VIEW public.v_tranches_excedent AS
 SELECT id AS tranche_id, ecole_id, eleve_id, frais_id, numero, label, montant, paye,
    paye - montant AS excedent, updated_at
   FROM tranches t
  WHERE paye > montant;

CREATE OR REPLACE VIEW public.v_creances_services AS
 SELECT f.ecole_id, f.annee_id, f.id AS facture_id, f.numero, f.libelle, f.categorie,
    f.montant, f.montant_paye, f.montant - f.montant_paye AS reste_du, f.date_echeance, f.statut,
    f.date_echeance < CURRENT_DATE AS echue,
    GREATEST(0, CURRENT_DATE - f.date_echeance) AS jours_retard,
    f.eleve_id, (e.nom || ' '::text) || e.prenom AS eleve, e.matricule, c.nom AS classe
   FROM factures f
     LEFT JOIN eleves e ON e.id = f.eleve_id
     LEFT JOIN classes c ON c.id = e.classe_id
  WHERE f.statut <> 'annulee'::text AND f.montant_paye < f.montant AND (f.categorie = ANY (ARRAY['cantine'::text, 'transport'::text]));

CREATE OR REPLACE VIEW public.v_notifications_fournisseurs AS
 SELECT ecole_id, provider, canal, count(*) AS total,
    count(*) FILTER (WHERE statut = 'envoye'::text) AS envoyes,
    count(*) FILTER (WHERE statut <> 'envoye'::text) AS echecs,
    count(*) FILTER (WHERE created_at >= date_trunc('month'::text, now())) AS mois_courant,
    count(*) FILTER (WHERE created_at >= date_trunc('month'::text, now()) AND statut <> 'echec'::text) AS mois_courant_decompte,
    max(created_at) AS dernier_envoi,
    (array_agg(provider_response ->> 'message'::text ORDER BY created_at DESC) FILTER (WHERE statut <> 'envoye'::text))[1] AS derniere_erreur
   FROM sms_logs l
  GROUP BY ecole_id, provider, canal;

CREATE OR REPLACE VIEW public.v_grilles_desynchronisees AS
 WITH officiel AS (
         SELECT g.ecole_id, g.annee_id, g.libelle,
            (tr.value ->> 'numero'::text)::integer AS numero,
            (tr.value ->> 'montant'::text)::numeric AS montant_officiel
           FROM grille_tarifs_niveaux g,
            LATERAL jsonb_array_elements(g.tranches) tr(value)
        )
 SELECT t.ecole_id, fs.annee_id, fs.libelle AS grille, t.numero, o.montant_officiel,
    t.montant AS montant_applique,
    count(DISTINCT t.eleve_id) AS eleves_concernes,
    sum(o.montant_officiel - t.montant) AS ecart_total
   FROM tranches t
     JOIN frais_scolarite fs ON fs.id = t.frais_id
     JOIN officiel o ON o.libelle = fs.libelle AND o.annee_id = fs.annee_id AND o.numero = t.numero
  WHERE t.montant <> o.montant_officiel
  GROUP BY t.ecole_id, fs.annee_id, fs.libelle, t.numero, o.montant_officiel, t.montant;

CREATE OR REPLACE VIEW public.v_controle_financier AS
 SELECT t.ecole_id, 'scolarite'::text AS circuit, 'ecart_tranche'::text AS anomalie,
    'critique'::text AS gravite, t.id AS cible_id, t.eleve_id,
    (((('Tranche '::text || t.numero) || ' : paye='::text) || t.paye) || ' vs paiements='::text) || COALESCE(sum(p.montant), 0::numeric) AS detail
   FROM tranches t
     LEFT JOIN paiements p ON p.tranche_id = t.id AND p.annule_le IS NULL
  GROUP BY t.id
 HAVING t.paye <> COALESCE(sum(p.montant), 0::numeric)
UNION ALL
 SELECT t.ecole_id, 'scolarite'::text, 'excedent_tranche'::text, 'attention'::text, t.id, t.eleve_id,
    ((((('Tranche '::text || t.numero) || ' : '::text) || t.paye) || ' verse pour '::text) || t.montant) || ' du'::text
   FROM tranches t
  WHERE t.paye > t.montant
UNION ALL
 SELECT f.ecole_id, 'factures'::text, 'ecart_facture'::text, 'critique'::text, f.id, f.eleve_id,
    (((('Facture '::text || f.numero) || ' : montant_paye='::text) || f.montant_paye) || ' vs paiements='::text) || COALESCE(sum(p.montant), 0::numeric)
   FROM factures f
     LEFT JOIN paiements p ON p.facture_id = f.id AND p.annule_le IS NULL
  GROUP BY f.id
 HAVING f.montant_paye <> COALESCE(sum(p.montant), 0::numeric)
UNION ALL
 SELECT f.ecole_id, 'factures'::text, 'facture_annulee_avec_reglement'::text, 'critique'::text, f.id, f.eleve_id,
    ((('Facture '::text || f.numero) || ' annulee mais '::text) || COALESCE(sum(p.montant), 0::numeric)) || ' encore encaisse'::text
   FROM factures f
     JOIN paiements p ON p.facture_id = f.id AND p.annule_le IS NULL
  WHERE f.statut = 'annulee'::text
  GROUP BY f.id
UNION ALL
 SELECT e.ecole_id, 'services_recurrents'::text, 'ecart_echeance'::text, 'critique'::text, e.id, e.eleve_id,
    (((('Echeance '::text || e.label) || ' : paye='::text) || e.paye) || ' vs reglements='::text) || COALESCE(sum(ps.montant), 0::numeric)
   FROM echeances_services e
     LEFT JOIN paiements_services ps ON ps.echeance_id = e.id
  GROUP BY e.id
 HAVING e.paye <> COALESCE(sum(ps.montant), 0::numeric)
UNION ALL
 SELECT e.ecole_id, 'services_recurrents'::text, 'surpaiement_echeance'::text, 'attention'::text, e.id, e.eleve_id,
    ((((('Echeance '::text || e.label) || ' : '::text) || e.paye) || ' verse pour '::text) || e.montant) || ' du'::text
   FROM echeances_services e
  WHERE e.paye > e.montant
UNION ALL
 SELECT sp.ecole_id, 'services_ponctuels'::text, 'surpaiement'::text, 'attention'::text, sp.id, sp.eleve_id,
    ((((('Paiement '::text || COALESCE(sp.numero, ''::text)) || ' : '::text) || sp.montant_paye) || ' verse pour '::text) || sp.montant_du) || ' du'::text
   FROM sp_paiements sp
  WHERE sp.annule_le IS NULL AND sp.montant_du IS NOT NULL AND sp.montant_paye > sp.montant_du
UNION ALL
 SELECT vp.ecole_id, 'vacances'::text, 'surpaiement'::text, 'attention'::text, vp.id, vp.eleve_id,
    ((vp.montant_paye || ' verse pour '::text) || vp.montant_attendu) || ' attendu'::text
   FROM vacances_paiements vp
  WHERE vp.montant_attendu IS NOT NULL AND vp.montant_paye > vp.montant_attendu
UNION ALL
 SELECT vp.ecole_id, 'vacances'::text, 'date_aberrante'::text, 'attention'::text, vp.id, vp.eleve_id,
    'Date de paiement invraisemblable : '::text || vp.date_paiement
   FROM vacances_paiements vp
  WHERE vp.date_paiement < '2020-01-01'::date OR vp.date_paiement > (CURRENT_DATE + '1 year'::interval)
UNION ALL
 SELECT bp.ecole_id, 'paie'::text, 'bulletin_sans_depense'::text, 'critique'::text, bp.id, NULL::uuid,
    ((('Bulletin '::text || bp.mois) || '/'::text) || bp.annee) || ' paye sans ecriture comptable'::text
   FROM bulletins_paie bp
  WHERE bp.statut = 'paye'::text AND bp.depense_id IS NULL;

CREATE OR REPLACE VIEW public.v_encaissements_detail AS
 SELECT p.ecole_id, p.date_paiement AS date_operation, 'scolarite'::text AS source,
    'Scolarité'::text AS libelle, false AS est_remise, p.montant, p.mode::text AS mode_paiement,
    p.reference, (e.nom || ' '::text) || e.prenom AS eleve, e.matricule
   FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
  WHERE p.annule_le IS NULL AND p.tranche_id IS NOT NULL AND (p.mode <> ALL (ARRAY['remise'::paiement_mode, 'bourse'::paiement_mode, 'prise_en_charge'::paiement_mode]))
UNION ALL
 SELECT p.ecole_id, p.date_paiement, 'remises'::text, 'Remises & bourses'::text, true, p.montant,
    p.mode::text, p.reference, (e.nom || ' '::text) || e.prenom, e.matricule
   FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
  WHERE p.annule_le IS NULL AND (p.mode = ANY (ARRAY['remise'::paiement_mode, 'bourse'::paiement_mode, 'prise_en_charge'::paiement_mode]))
UNION ALL
 SELECT p.ecole_id, p.date_paiement,
        CASE split_part(f.numero, '-'::text, 1)
            WHEN 'CTN'::text THEN 'cantine'::text
            WHEN 'TRP'::text THEN 'transport'::text
            WHEN 'TEN'::text THEN 'tenues'::text
            WHEN 'INS'::text THEN 'inscription'::text
            ELSE 'autres_factures'::text
        END,
        CASE split_part(f.numero, '-'::text, 1)
            WHEN 'CTN'::text THEN 'Cantine'::text
            WHEN 'TRP'::text THEN 'Transport / Car'::text
            WHEN 'TEN'::text THEN 'Tenues scolaires'::text
            WHEN 'INS'::text THEN 'Frais d''inscription'::text
            ELSE 'Autres factures'::text
        END,
    false, p.montant, p.mode::text, f.numero, (e.nom || ' '::text) || e.prenom, e.matricule
   FROM paiements p
     JOIN factures f ON f.id = p.facture_id
     JOIN eleves e ON e.id = p.eleve_id
  WHERE p.annule_le IS NULL
UNION ALL
 SELECT ps.ecole_id, ps.created_at::date, 'services_recurrents'::text, 'Services récurrents'::text,
    false, ps.montant, ps.mode, NULL::text, COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule
   FROM paiements_services ps
     LEFT JOIN echeances_services es ON es.id = ps.echeance_id
     LEFT JOIN eleves e ON e.id = es.eleve_id
UNION ALL
 SELECT sp.ecole_id, sp.date_paiement::date, 'services_ponctuels'::text, 'Services ponctuels'::text,
    false, sp.montant_paye, sp.mode_paiement::text, sp.numero,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule
   FROM sp_paiements sp
     LEFT JOIN eleves e ON e.id = sp.eleve_id
  WHERE sp.annule_le IS NULL
UNION ALL
 SELECT vp.ecole_id, vp.date_paiement, 'vacances'::text, 'Cours de vacances'::text,
    false, vp.montant_paye, vp.mode, NULL::text,
    COALESCE((e.nom || ' '::text) || e.prenom, '—'::text), e.matricule
   FROM vacances_paiements vp
     LEFT JOIN eleves e ON e.id = vp.eleve_id;

CREATE OR REPLACE VIEW public.v_budget_realise AS
 WITH bornes AS (
         SELECT annees_scolaires.id AS annee_id, annees_scolaires.ecole_id
           FROM annees_scolaires
        )
 SELECT b.ecole_id, b.annee_id, 'recette'::text AS type, 'scolarite'::text AS source,
    COALESCE(sum(p.montant), 0::numeric) AS montant
   FROM bornes b
     LEFT JOIN paiements p ON p.ecole_id = b.ecole_id AND p.annule_le IS NULL AND p.tranche_id IS NOT NULL AND COALESCE(( SELECT fs.annee_id
           FROM tranches t
             JOIN frais_scolarite fs ON fs.id = t.frais_id
          WHERE t.id = p.tranche_id), annee_pour_date(p.ecole_id, p.date_paiement)) = b.annee_id
  GROUP BY b.ecole_id, b.annee_id
UNION ALL
 SELECT b.ecole_id, b.annee_id, 'recette'::text, 'services_recurrents'::text,
    COALESCE(sum(p.montant), 0::numeric)
   FROM bornes b
     LEFT JOIN paiements p ON p.ecole_id = b.ecole_id AND p.annule_le IS NULL AND p.facture_id IS NOT NULL
     LEFT JOIN factures f ON f.id = p.facture_id AND (f.categorie = ANY (ARRAY['cantine'::text, 'transport'::text])) AND COALESCE(f.annee_id, annee_pour_date(p.ecole_id, p.date_paiement)) = b.annee_id
  WHERE f.id IS NOT NULL OR p.id IS NULL
  GROUP BY b.ecole_id, b.annee_id
UNION ALL
 SELECT b.ecole_id, b.annee_id, 'recette'::text, 'autres_factures'::text,
    COALESCE(sum(p.montant), 0::numeric)
   FROM bornes b
     LEFT JOIN paiements p ON p.ecole_id = b.ecole_id AND p.annule_le IS NULL AND p.facture_id IS NOT NULL
     LEFT JOIN factures f ON f.id = p.facture_id AND (COALESCE(f.categorie, 'autre'::text) <> ALL (ARRAY['cantine'::text, 'transport'::text])) AND COALESCE(f.annee_id, annee_pour_date(p.ecole_id, p.date_paiement)) = b.annee_id
  WHERE f.id IS NOT NULL OR p.id IS NULL
  GROUP BY b.ecole_id, b.annee_id
UNION ALL
 SELECT b.ecole_id, b.annee_id, 'recette'::text, 'services_ponctuels'::text,
    COALESCE(sum(sp.montant_paye), 0::numeric)
   FROM bornes b
     LEFT JOIN sp_paiements sp ON sp.ecole_id = b.ecole_id AND sp.annule_le IS NULL AND annee_pour_date(sp.ecole_id, sp.date_paiement::date) = b.annee_id
  GROUP BY b.ecole_id, b.annee_id
UNION ALL
 SELECT b.ecole_id, b.annee_id, 'recette'::text, 'vacances'::text,
    COALESCE(sum(vp.montant_paye), 0::numeric)
   FROM bornes b
     LEFT JOIN vacances_paiements vp ON vp.ecole_id = b.ecole_id AND annee_pour_date(vp.ecole_id, vp.date_paiement) = b.annee_id
  GROUP BY b.ecole_id, b.annee_id
UNION ALL
 SELECT b.ecole_id, b.annee_id, 'depense'::text, 'depenses'::text,
    COALESCE(sum(d.montant), 0::numeric)
   FROM bornes b
     LEFT JOIN depenses d ON d.ecole_id = b.ecole_id AND (d.categorie <> ALL (ARRAY['Salaires et charges du personnel'::text, 'CNPS'::text])) AND annee_pour_date(d.ecole_id, d.date_depense) = b.annee_id
  GROUP BY b.ecole_id, b.annee_id
UNION ALL
 SELECT b.ecole_id, b.annee_id, 'depense'::text, 'salaires'::text,
    COALESCE(sum(d.montant), 0::numeric)
   FROM bornes b
     LEFT JOIN depenses d ON d.ecole_id = b.ecole_id AND (d.categorie = ANY (ARRAY['Salaires et charges du personnel'::text, 'CNPS'::text])) AND annee_pour_date(d.ecole_id, d.date_depense) = b.annee_id
  GROUP BY b.ecole_id, b.annee_id;

-- =====================================================================
-- E) FONCTIONS MÉTIER
-- =====================================================================

CREATE OR REPLACE FUNCTION public.controle_financier(_ecole_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'genere_le', now(),
    'critiques', COALESCE(count(*) FILTER (WHERE gravite='critique'), 0),
    'attentions', COALESCE(count(*) FILTER (WHERE gravite='attention'), 0),
    'total', count(*),
    'anomalies', COALESCE(jsonb_agg(jsonb_build_object(
        'circuit', circuit, 'anomalie', anomalie, 'gravite', gravite,
        'cible_id', cible_id, 'eleve_id', eleve_id, 'detail', detail)
      ORDER BY gravite, circuit) FILTER (WHERE cible_id IS NOT NULL), '[]'::jsonb))
  FROM v_controle_financier
  WHERE _ecole_id IS NULL OR ecole_id = _ecole_id;
$function$;

CREATE OR REPLACE FUNCTION public.encaissements_du_jour(_ecole_id uuid, _date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH src AS (
    SELECT source, libelle, est_remise, count(*) AS nb, SUM(montant) AS total,
           jsonb_agg(jsonb_build_object('eleve', eleve, 'matricule', matricule,
             'montant', montant, 'mode', mode_paiement, 'reference', reference)
             ORDER BY montant DESC) AS operations
    FROM v_encaissements_detail
    WHERE ecole_id = _ecole_id AND date_operation = _date
    GROUP BY source, libelle, est_remise)
  SELECT jsonb_build_object(
    'date', _date,
    'total_encaisse', COALESCE((SELECT SUM(total) FROM src WHERE NOT est_remise), 0),
    'total_remises',  COALESCE((SELECT SUM(total) FROM src WHERE est_remise), 0),
    'sources', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'source', source, 'libelle', libelle, 'est_remise', est_remise,
        'nb', nb, 'total', total, 'operations', operations)
        ORDER BY est_remise, total DESC) FROM src), '[]'::jsonb));
$function$;

CREATE OR REPLACE FUNCTION public.rafraichir_budget_realise(_ecole_id uuid, _annee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nb int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND ecole_id = _ecole_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE lignes_budget lb
     SET montant_realise = r.montant, updated_at = now()
    FROM v_budget_realise r
   WHERE lb.ecole_id = _ecole_id AND lb.annee_id = _annee_id
     AND lb.source IS NOT NULL
     AND r.ecole_id = lb.ecole_id AND r.annee_id = lb.annee_id AND r.source = lb.source
     AND lb.montant_realise IS DISTINCT FROM r.montant;

  GET DIAGNOSTICS v_nb = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'lignes_mises_a_jour', v_nb);
END; $function$;

CREATE OR REPLACE FUNCTION public.rh_calculer_bulletin(_ecole_id uuid, _personnel_id uuid, _mois integer, _annee integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD; c RECORD;
  v_par jsonb; v_lignes jsonb := '[]'::jsonb; v_alertes jsonb := '[]'::jsonb;
  v_base numeric; v_anc_annees int := 0; v_anc_taux numeric := 0; v_anc numeric := 0;
  v_gains numeric := 0; v_imposable numeric := 0; v_base_cnps numeric := 0;
  v_plafond numeric; v_cnps_sal numeric; v_cmu_sal numeric; v_irpp numeric := 0;
  v_retenues numeric := 0; v_patronales numeric := 0; v_net numeric;
  v_parts numeric; v_quotient numeric; v_reste numeric; t RECORD;
BEGIN
  SELECT * INTO p FROM enseignants WHERE id = _personnel_id AND ecole_id = _ecole_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'raison', 'personnel_introuvable'); END IF;

  SELECT jsonb_object_agg(cle, valeur) INTO v_par FROM rh_parametres WHERE ecole_id = _ecole_id;
  IF v_par IS NULL THEN RETURN jsonb_build_object('ok', false, 'raison', 'parametres_absents'); END IF;

  -- Salaire de base : contrat actif prioritaire, sinon fiche
  SELECT * INTO c FROM contrats_enseignants
   WHERE enseignant_id = _personnel_id AND statut = 'actif'
   ORDER BY date_debut DESC LIMIT 1;

  v_base := COALESCE(NULLIF(c.salaire_base, 0), NULLIF(p.salaire_brut_base, 0), 0);
  IF c.quotite IS NOT NULL AND c.quotite > 0 THEN
    v_base := ROUND(v_base * c.quotite / 100);
  END IF;

  IF v_base <= 0 THEN
    v_alertes := v_alertes || to_jsonb('Aucun salaire de base défini (contrat ou fiche)'::text);
  END IF;

  -- Anciennete
  IF p.date_embauche IS NULL THEN
    v_alertes := v_alertes || to_jsonb('Date d''embauche absente : ancienneté calculée à zéro'::text);
  ELSE
    v_anc_annees := GREATEST(0, EXTRACT(YEAR FROM age(make_date(_annee, _mois, 1), p.date_embauche))::int);
  END IF;
  SELECT taux INTO v_anc_taux FROM rh_bareme_anciennete
   WHERE ecole_id = _ecole_id AND annees_min <= v_anc_annees
   ORDER BY annees_min DESC LIMIT 1;
  v_anc_taux := COALESCE(v_anc_taux, 0);
  v_anc := ROUND(v_base * v_anc_taux / 100);

  IF p.numero_cnps IS NULL OR btrim(p.numero_cnps) = '' THEN
    v_alertes := v_alertes || to_jsonb('Numéro CNPS non renseigné'::text);
  END IF;

  -- GAINS
  v_lignes := v_lignes || jsonb_build_object('code','salaire_base','libelle','Salaire de base',
    'type','gain','base',v_base,'taux',NULL,'montant',v_base,'ordre',1);
  v_gains := v_base; v_imposable := v_base; v_base_cnps := v_base;

  IF v_anc > 0 THEN
    v_lignes := v_lignes || jsonb_build_object('code','prime_anciennete','libelle','Prime d''ancienneté',
      'type','gain','base',v_base,'taux',v_anc_taux,'montant',v_anc,'ordre',3);
    v_gains := v_gains + v_anc; v_imposable := v_imposable + v_anc; v_base_cnps := v_base_cnps + v_anc;
  END IF;

  -- Primes du contrat : imposables et soumises CNPS par defaut
  IF c.primes IS NOT NULL AND jsonb_typeof(c.primes) = 'array' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(c.primes) AS x(v) LOOP
      IF COALESCE((t.v->>'montant')::numeric, 0) > 0 THEN
        v_lignes := v_lignes || jsonb_build_object('code','prime_exceptionnelle',
          'libelle', COALESCE(t.v->>'libelle','Prime'), 'type','gain','base',NULL,'taux',NULL,
          'montant',(t.v->>'montant')::numeric,'ordre',8);
        v_gains := v_gains + (t.v->>'montant')::numeric;
        v_imposable := v_imposable + (t.v->>'montant')::numeric;
        v_base_cnps := v_base_cnps + (t.v->>'montant')::numeric;
      END IF;
    END LOOP;
  END IF;

  -- RETENUES SALARIALES
  v_plafond := COALESCE((v_par->>'cnps_plafond_mensuel')::numeric, 3375000);
  v_cnps_sal := ROUND(LEAST(v_base_cnps, v_plafond) * COALESCE((v_par->>'cnps_retraite_salariale')::numeric,0) / 100);
  v_cmu_sal := COALESCE((v_par->>'cmu_part_salariale')::numeric, 0);

  -- IRPP progressif sur le quotient familial
  v_parts := GREATEST(COALESCE(p.parts_fiscales, 1), 1);
  v_quotient := (v_imposable - v_cnps_sal) / v_parts;
  FOR t IN SELECT tranche_min, tranche_max, taux FROM rh_bareme_irpp
            WHERE ecole_id = _ecole_id ORDER BY ordre LOOP
    IF v_quotient > t.tranche_min - 1 THEN
      v_reste := LEAST(v_quotient, COALESCE(t.tranche_max, v_quotient)) - (t.tranche_min - 1);
      IF v_reste > 0 THEN v_irpp := v_irpp + v_reste * t.taux / 100; END IF;
    END IF;
  END LOOP;
  v_irpp := ROUND(GREATEST(v_irpp, 0) * v_parts);

  v_lignes := v_lignes
    || jsonb_build_object('code','cnps_salarie','libelle','CNPS salarié','type','retenue',
         'base',LEAST(v_base_cnps, v_plafond),'taux',(v_par->>'cnps_retraite_salariale')::numeric,'montant',v_cnps_sal,'ordre',1)
    || jsonb_build_object('code','cmu_salarie','libelle','CMU salarié','type','retenue',
         'base',NULL,'taux',NULL,'montant',v_cmu_sal,'ordre',2)
    || jsonb_build_object('code','its_irpp','libelle','ITS / IRPP','type','retenue',
         'base',v_imposable - v_cnps_sal,'taux',NULL,'montant',v_irpp,'ordre',3);
  v_retenues := v_cnps_sal + v_cmu_sal + v_irpp;

  -- CHARGES PATRONALES
  FOR t IN SELECT * FROM (VALUES
      ('cnps_employeur','CNPS employeur','cnps_retraite_patronale',1),
      ('prestations_familiales','Prestations familiales','cnps_prestations_familiales',2),
      ('assurance_maternite','Assurance maternité','cnps_maternite',3),
      ('accident_travail','Accident du travail','cnps_accident_travail',4),
      ('contribution_employeur','Contribution employeur / IS locaux','cp_contribution_employeur',6),
      ('taxe_apprentissage','Taxe d''apprentissage','cp_taxe_apprentissage',7),
      ('fdfp','FDFP / Formation professionnelle','cp_fdfp',8)
    ) AS x(code, libelle, cle, ordre)
  LOOP
    DECLARE v_taux numeric; v_mt numeric;
    BEGIN
      v_taux := COALESCE((v_par->>t.cle)::numeric, 0);
      v_mt := ROUND(LEAST(v_base_cnps, v_plafond) * v_taux / 100);
      IF v_mt > 0 THEN
        v_lignes := v_lignes || jsonb_build_object('code',t.code,'libelle',t.libelle,
          'type','charge_patronale','base',LEAST(v_base_cnps, v_plafond),'taux',v_taux,'montant',v_mt,'ordre',t.ordre);
        v_patronales := v_patronales + v_mt;
      END IF;
    END;
  END LOOP;

  IF COALESCE((v_par->>'cmu_part_patronale')::numeric,0) > 0 THEN
    v_lignes := v_lignes || jsonb_build_object('code','cmu_employeur','libelle','CMU employeur',
      'type','charge_patronale','base',NULL,'taux',NULL,
      'montant',(v_par->>'cmu_part_patronale')::numeric,'ordre',5);
    v_patronales := v_patronales + (v_par->>'cmu_part_patronale')::numeric;
  END IF;

  v_net := v_gains - v_retenues;

  RETURN jsonb_build_object(
    'ok', true,
    'personnel_id', p.id, 'matricule', p.matricule,
    'nom', p.nom, 'prenom', p.prenom, 'poste', COALESCE(p.poste, p.specialite),
    'mois', _mois, 'annee', _annee,
    'anciennete_annees', v_anc_annees, 'anciennete_taux', v_anc_taux,
    'total_gains', v_gains, 'brut_imposable', v_imposable, 'base_cnps', v_base_cnps,
    'total_retenues', v_retenues, 'total_charges_patronales', v_patronales,
    'net_a_payer', v_net, 'cout_employeur', v_gains + v_patronales,
    'lignes', v_lignes, 'alertes', v_alertes);
END; $function$;

CREATE OR REPLACE FUNCTION public.rh_masse_salariale_prevue(_ecole_id uuid, _annee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a RECORD; r RECORD; calc jsonb;
  v_mois_ref int; v_annee_ref int; v_nb_mois int;
  v_cout_mensuel numeric := 0; v_effectif int := 0; v_sans_salaire int := 0;
BEGIN
  SELECT debut, fin INTO a FROM annees_scolaires WHERE id = _annee_id AND ecole_id = _ecole_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'raison', 'annee_introuvable'); END IF;

  v_nb_mois := GREATEST(1,
    (EXTRACT(YEAR FROM a.fin)::int - EXTRACT(YEAR FROM a.debut)::int) * 12
    + (EXTRACT(MONTH FROM a.fin)::int - EXTRACT(MONTH FROM a.debut)::int) + 1);

  v_mois_ref := EXTRACT(MONTH FROM a.debut)::int;
  v_annee_ref := EXTRACT(YEAR FROM a.debut)::int;

  FOR r IN SELECT id FROM enseignants WHERE ecole_id = _ecole_id AND statut = 'actif'
  LOOP
    calc := rh_calculer_bulletin(_ecole_id, r.id, v_mois_ref, v_annee_ref);
    -- Un agent sans salaire de base ne genere aucune provision,
    -- meme si certaines charges sont des montants fixes (CMU).
    IF (calc->>'ok')::boolean IS TRUE AND COALESCE((calc->>'total_gains')::numeric, 0) > 0 THEN
      v_cout_mensuel := v_cout_mensuel + COALESCE((calc->>'cout_employeur')::numeric, 0);
      v_effectif := v_effectif + 1;
    ELSE
      v_sans_salaire := v_sans_salaire + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'effectif_avec_salaire', v_effectif,
    'effectif_sans_salaire', v_sans_salaire,
    'cout_employeur_mensuel', v_cout_mensuel,
    'nb_mois', v_nb_mois,
    'masse_annuelle', v_cout_mensuel * v_nb_mois);
END; $function$;

CREATE OR REPLACE FUNCTION public.rh_apercu_paie(_ecole_id uuid, _mois integer, _annee integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD; calc jsonb; items jsonb := '[]'::jsonb;
  n_prets int := 0; n_corr int := 0; n_deja int := 0; net_total numeric := 0;
BEGIN
  FOR r IN SELECT id FROM enseignants WHERE ecole_id = _ecole_id AND statut = 'actif' ORDER BY nom, prenom
  LOOP
    IF EXISTS (SELECT 1 FROM bulletins_paie b
                WHERE b.ecole_id=_ecole_id AND b.enseignant_id=r.id AND b.mois=_mois AND b.annee=_annee) THEN
      n_deja := n_deja + 1;
      calc := rh_calculer_bulletin(_ecole_id, r.id, _mois, _annee);
      items := items || (calc || jsonb_build_object('etat','deja_cree'));
      CONTINUE;
    END IF;

    calc := rh_calculer_bulletin(_ecole_id, r.id, _mois, _annee);
    IF (calc->>'ok')::boolean IS NOT TRUE OR COALESCE((calc->>'total_gains')::numeric,0) <= 0 THEN
      n_corr := n_corr + 1;
      items := items || (calc || jsonb_build_object('etat','a_corriger'));
    ELSE
      n_prets := n_prets + 1;
      net_total := net_total + COALESCE((calc->>'net_a_payer')::numeric,0);
      items := items || (calc || jsonb_build_object('etat','pret'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok',true,'mois',_mois,'annee',_annee,
    'prets',n_prets,'a_corriger',n_corr,'deja_crees',n_deja,
    'net_estime',net_total,'personnels',items);
END; $function$;

CREATE OR REPLACE FUNCTION public.rh_generer_brouillons(_ecole_id uuid, _mois integer, _annee integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD; calc jsonb; l jsonb; v_id uuid; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  FOR r IN SELECT id FROM enseignants WHERE ecole_id=_ecole_id AND statut='actif'
  LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM bulletins_paie b
      WHERE b.ecole_id=_ecole_id AND b.enseignant_id=r.id AND b.mois=_mois AND b.annee=_annee);

    calc := rh_calculer_bulletin(_ecole_id, r.id, _mois, _annee);
    CONTINUE WHEN (calc->>'ok')::boolean IS NOT TRUE
              OR COALESCE((calc->>'total_gains')::numeric,0) <= 0;

    INSERT INTO bulletins_paie (ecole_id, enseignant_id, mois, annee, statut,
      salaire_brut, retenues, net_a_payer, total_gains, brut_imposable, base_cnps,
      total_charges_patronales, cout_employeur, anciennete_annees)
    VALUES (_ecole_id, r.id, _mois, _annee, 'brouillon',
      (calc->>'total_gains')::numeric, (calc->>'total_retenues')::numeric,
      (calc->>'net_a_payer')::numeric, (calc->>'total_gains')::numeric,
      (calc->>'brut_imposable')::numeric, (calc->>'base_cnps')::numeric,
      (calc->>'total_charges_patronales')::numeric, (calc->>'cout_employeur')::numeric,
      (calc->>'anciennete_annees')::int)
    RETURNING id INTO v_id;

    FOR l IN SELECT * FROM jsonb_array_elements(calc->'lignes') LOOP
      INSERT INTO rh_bulletin_lignes (ecole_id, bulletin_id, rubrique_code, libelle, type, base, taux, montant, ordre)
      VALUES (_ecole_id, v_id, l->>'code', l->>'libelle', l->>'type',
              COALESCE((l->>'base')::numeric,0), (l->>'taux')::numeric,
              (l->>'montant')::numeric, COALESCE((l->>'ordre')::int,0));
    END LOOP;
    n := n + 1;
  END LOOP;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (_ecole_id, auth.uid(), 'paie.generer_brouillons', _mois || '/' || _annee, 'info',
          jsonb_build_object('bulletins_crees', n));

  RETURN jsonb_build_object('ok', true, 'crees', n);
END; $function$;

CREATE OR REPLACE FUNCTION public.rh_valider_bulletin(_bulletin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO b FROM bulletins_paie WHERE id = _bulletin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'bulletin_introuvable'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), b.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF b.statut = 'paye' THEN RAISE EXCEPTION 'bulletin_deja_paye'; END IF;

  UPDATE bulletins_paie SET statut='valide', valide_le=now(), valide_par=auth.uid(), updated_at=now()
   WHERE id=_bulletin_id;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (b.ecole_id, auth.uid(), 'paie.valider', _bulletin_id::text, 'info',
          jsonb_build_object('mois', b.mois, 'annee', b.annee, 'net', b.net_a_payer));
  RETURN jsonb_build_object('ok', true, 'statut', 'valide');
END; $function$;

CREATE OR REPLACE FUNCTION public.rh_payer_bulletin(_bulletin_id uuid, _date_paiement date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b RECORD; p RECORD; v_dep uuid; v_dep2 uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO b FROM bulletins_paie WHERE id = _bulletin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'bulletin_introuvable'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), b.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF b.statut = 'paye' THEN RAISE EXCEPTION 'bulletin_deja_paye'; END IF;
  IF b.statut <> 'valide' THEN RAISE EXCEPTION 'bulletin_non_valide'; END IF;

  SELECT nom, prenom, matricule INTO p FROM enseignants WHERE id = b.enseignant_id;

  -- Sortie de tresorerie : salaire brut
  INSERT INTO depenses (ecole_id, libelle, categorie, montant, date_depense, statut, cree_par)
  VALUES (b.ecole_id,
          'Salaire ' || lpad(b.mois::text,2,'0') || '/' || b.annee || ' — ' || p.nom || ' ' || p.prenom
            || ' (' || p.matricule || ')',
          'Salaires et charges du personnel', b.salaire_brut, _date_paiement, 'validee', auth.uid())
  RETURNING id INTO v_dep;

  -- Charges patronales : imputees en CNPS
  IF COALESCE(b.total_charges_patronales,0) > 0 THEN
    INSERT INTO depenses (ecole_id, libelle, categorie, montant, date_depense, statut, cree_par)
    VALUES (b.ecole_id,
            'Charges patronales ' || lpad(b.mois::text,2,'0') || '/' || b.annee || ' — ' || p.nom || ' ' || p.prenom,
            'CNPS', b.total_charges_patronales, _date_paiement, 'validee', auth.uid())
    RETURNING id INTO v_dep2;
  END IF;

  UPDATE bulletins_paie
     SET statut='paye', date_paiement=_date_paiement, depense_id=v_dep, updated_at=now()
   WHERE id=_bulletin_id;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (b.ecole_id, auth.uid(), 'paie.payer', _bulletin_id::text, 'warning',
          jsonb_build_object('mois',b.mois,'annee',b.annee,'net',b.net_a_payer,
                             'depense_salaire',v_dep,'depense_charges',v_dep2));

  RETURN jsonb_build_object('ok',true,'statut','paye','depense_id',v_dep,'depense_charges_id',v_dep2);
END; $function$;

CREATE OR REPLACE FUNCTION public.generer_budget_previsionnel(_ecole_id uuid, _annee_id uuid, _remplacer boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scolarite numeric; v_services numeric; v_vacances numeric; v_salaires numeric;
  v_effectif int; v_nb int := 0; v_existant int; v_masse jsonb; v_abonnements int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT count(*) INTO v_existant FROM lignes_budget
   WHERE ecole_id = _ecole_id AND annee_id = _annee_id;
  IF v_existant > 0 AND NOT _remplacer THEN
    RAISE EXCEPTION 'budget_deja_genere:%', v_existant;
  END IF;

  SELECT COALESCE(SUM(t.montant), 0), count(DISTINCT t.eleve_id) INTO v_scolarite, v_effectif
  FROM tranches t JOIN frais_scolarite fs ON fs.id = t.frais_id
  WHERE t.ecole_id = _ecole_id AND fs.annee_id = _annee_id;

  -- Cantine et transport : factures emises pour ces categories
  SELECT COALESCE(SUM(f.montant), 0), count(DISTINCT f.eleve_id)
    INTO v_services, v_abonnements
  FROM factures f
  WHERE f.ecole_id = _ecole_id AND f.annee_id = _annee_id
    AND f.categorie IN ('cantine','transport') AND f.statut <> 'annulee';

  SELECT COALESCE(SUM(vp.montant_attendu), 0) INTO v_vacances
  FROM vacances_paiements vp
  WHERE vp.ecole_id = _ecole_id AND annee_pour_date(vp.ecole_id, vp.date_paiement) = _annee_id;

  v_masse := rh_masse_salariale_prevue(_ecole_id, _annee_id);
  v_salaires := COALESCE((v_masse->>'masse_annuelle')::numeric, 0);

  INSERT INTO lignes_budget (ecole_id, annee_id, libelle, type, montant_prevu, montant_realise, source)
  VALUES
    (_ecole_id, _annee_id, 'Frais de scolarité',         'recette', v_scolarite, 0, 'scolarite'),
    (_ecole_id, _annee_id, 'Cantine et transport',       'recette', v_services,  0, 'services_recurrents'),
    (_ecole_id, _annee_id, 'Autres factures',            'recette', 0,           0, 'autres_factures'),
    (_ecole_id, _annee_id, 'Services ponctuels',         'recette', 0,           0, 'services_ponctuels'),
    (_ecole_id, _annee_id, 'Cours de vacances',          'recette', v_vacances,  0, 'vacances'),
    (_ecole_id, _annee_id, 'Salaires et charges du personnel', 'depense', v_salaires, 0, 'salaires'),
    (_ecole_id, _annee_id, 'Dépenses de fonctionnement', 'depense', 0,           0, 'depenses')
  ON CONFLICT (ecole_id, annee_id, source) WHERE source IS NOT NULL
  DO UPDATE SET montant_prevu = CASE WHEN _remplacer THEN EXCLUDED.montant_prevu ELSE lignes_budget.montant_prevu END,
                libelle = EXCLUDED.libelle, updated_at = now();

  GET DIAGNOSTICS v_nb = ROW_COUNT;
  PERFORM rafraichir_budget_realise(_ecole_id, _annee_id);

  RETURN jsonb_build_object('ok', true, 'lignes', v_nb, 'effectif', v_effectif,
    'scolarite_prevue', v_scolarite, 'services_prevus', v_services,
    'eleves_abonnes', v_abonnements, 'vacances_prevues', v_vacances,
    'masse_salariale', v_masse);
END; $function$;

CREATE OR REPLACE FUNCTION public.annuler_paiement_scolarite(_paiement_id uuid, _motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pai paiements%ROWTYPE;
  v_tranche tranches%ROWTYPE;
  v_posterieur RECORD;
  v_nouveau_paye numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 5 THEN RAISE EXCEPTION 'motif_requis'; END IF;

  SELECT * INTO v_pai FROM paiements WHERE id = _paiement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'paiement_introuvable'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), v_pai.ecole_id, 'directeur'::app_role)
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF v_pai.annule_le IS NOT NULL THEN RAISE EXCEPTION 'deja_annule'; END IF;
  IF v_pai.facture_id IS NOT NULL THEN RAISE EXCEPTION 'paiement_facture'; END IF;
  IF v_pai.tranche_id IS NULL THEN RAISE EXCEPTION 'paiement_hors_tranche'; END IF;

  SELECT * INTO v_tranche FROM tranches WHERE id = v_pai.tranche_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tranche_introuvable'; END IF;

  SELECT t.numero INTO v_posterieur
  FROM tranches t
  WHERE t.eleve_id = v_tranche.eleve_id
    AND t.frais_id = v_tranche.frais_id
    AND t.numero > v_tranche.numero
    AND t.paye > 0
  ORDER BY t.numero ASC LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'tranche_posterieure_payee:%', v_posterieur.numero;
  END IF;

  UPDATE paiements
     SET annule_le = now(), annule_par = auth.uid(), motif_annulation = _motif
   WHERE id = _paiement_id;

  SELECT paye INTO v_nouveau_paye FROM tranches WHERE id = v_pai.tranche_id;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (v_pai.ecole_id, auth.uid(), 'paiement.annuler_scolarite', _paiement_id::text, 'warning',
    jsonb_build_object(
      'eleve_id', v_pai.eleve_id, 'tranche_id', v_pai.tranche_id,
      'tranche_numero', v_tranche.numero, 'montant_annule', v_pai.montant,
      'mode', v_pai.mode, 'reference', v_pai.reference, 'motif', _motif));

  RETURN jsonb_build_object(
    'ok', true, 'tranche_id', v_pai.tranche_id,
    'tranche_numero', v_tranche.numero,
    'montant_annule', v_pai.montant,
    'nouveau_paye_tranche', v_nouveau_paye);
END; $function$;

CREATE OR REPLACE FUNCTION public.solder_scolarite(_ecole_id uuid, _eleve_id uuid, _montant numeric, _mode text, _reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nb_frais int;
  v_du_total numeric;
  v_paye_total numeric;
  v_reste_global numeric;
  v_reste_tranches numeric;
  v_plafond numeric;
  v_restant numeric;
  v_part numeric;
  v_t RECORD;
  v_ref text;
  v_paiement_id uuid;
  v_lignes jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF NOT (
    private.has_ecole_role(auth.uid(), _ecole_id, 'admin'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role(auth.uid(), _ecole_id, 'comptable'::app_role)
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF _montant IS NULL OR _montant <= 0 THEN RAISE EXCEPTION 'montant_invalide'; END IF;

  -- Garde-fou : une seule grille de frais par eleve, sinon la ventilation
  -- melangerait deux annees scolaires.
  SELECT count(DISTINCT frais_id) INTO v_nb_frais
  FROM tranches WHERE ecole_id = _ecole_id AND eleve_id = _eleve_id;
  IF v_nb_frais > 1 THEN RAISE EXCEPTION 'multi_frais_non_supporte'; END IF;

  PERFORM 1 FROM tranches
   WHERE ecole_id = _ecole_id AND eleve_id = _eleve_id
   FOR UPDATE;

  -- Reste par tranche (peut surestimer si une tranche porte un excedent bloque)
  SELECT COALESCE(SUM(montant - paye), 0) INTO v_reste_tranches
  FROM tranches
  WHERE ecole_id = _ecole_id AND eleve_id = _eleve_id AND paye < montant;

  -- Reste global : identique au calcul de l'application
  -- (frais annuel - total reellement couvert, remises incluses)
  SELECT COALESCE(SUM(montant), 0) INTO v_du_total
  FROM tranches WHERE ecole_id = _ecole_id AND eleve_id = _eleve_id;

  SELECT COALESCE(SUM(p.montant), 0) INTO v_paye_total
  FROM paiements p
  JOIN tranches t ON t.id = p.tranche_id
  WHERE t.ecole_id = _ecole_id AND t.eleve_id = _eleve_id AND p.annule_le IS NULL;

  v_reste_global := GREATEST(v_du_total - v_paye_total, 0);

  -- Plafond = la plus contraignante des deux definitions
  v_plafond := LEAST(v_reste_tranches, v_reste_global);

  IF v_plafond <= 0 THEN RAISE EXCEPTION 'rien_a_encaisser'; END IF;
  IF _montant > v_plafond THEN
    RAISE EXCEPTION 'montant_depasse_reste:%', v_plafond;
  END IF;

  v_ref := COALESCE(NULLIF(btrim(_reference), ''),
           'ENC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)));

  v_restant := _montant;

  FOR v_t IN
    SELECT id, numero, label, montant, paye
    FROM tranches
    WHERE ecole_id = _ecole_id AND eleve_id = _eleve_id AND paye < montant
    ORDER BY numero ASC
  LOOP
    EXIT WHEN v_restant <= 0;
    v_part := LEAST(v_restant, v_t.montant - v_t.paye);
    IF v_part <= 0 THEN CONTINUE; END IF;

    INSERT INTO paiements (ecole_id, eleve_id, tranche_id, montant, mode, reference, recu_par)
    VALUES (_ecole_id, _eleve_id, v_t.id, v_part, _mode::paiement_mode, v_ref, auth.uid())
    RETURNING id INTO v_paiement_id;

    UPDATE tranches
       SET paye = v_t.paye + v_part,
           statut = CASE
             WHEN v_t.paye + v_part >= v_t.montant THEN 'payee'::tranche_statut
             ELSE 'partielle'::tranche_statut END,
           updated_at = now()
     WHERE id = v_t.id;

    v_lignes := v_lignes || jsonb_build_object(
      'paiement_id', v_paiement_id, 'tranche_id', v_t.id,
      'tranche_numero', v_t.numero, 'tranche_label', v_t.label,
      'montant', v_part,
      'solde_tranche', (v_t.montant - v_t.paye - v_part));

    v_restant := v_restant - v_part;
  END LOOP;

  INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (_ecole_id, auth.uid(), 'paiement.solder', _eleve_id::text, 'info',
    jsonb_build_object('montant_total', _montant, 'mode', _mode,
      'reference', v_ref, 'ventilation', v_lignes,
      'plafond_applique', v_plafond,
      'reste_global_avant', v_reste_global,
      'reste_tranches_avant', v_reste_tranches));

  RETURN jsonb_build_object(
    'ok', true, 'reference', v_ref, 'montant_total', _montant,
    'nb_tranches', jsonb_array_length(v_lignes),
    'reste_du_apres', v_plafond - _montant,
    'ventilation', v_lignes);
END; $function$;

-- =====================================================================
-- F) GARDE-FOUS MÉTIER — fonctions de trigger + triggers
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trg_abonnement_service_unique()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_existe boolean;
BEGIN
  IF NEW.statut <> 'actif' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'abonnements_cantine' THEN
    SELECT EXISTS (SELECT 1 FROM abonnements_cantine
      WHERE ecole_id=NEW.ecole_id AND eleve_id=NEW.eleve_id AND annee_id=NEW.annee_id
        AND statut='actif' AND id <> NEW.id) INTO v_existe;
  ELSE
    SELECT EXISTS (SELECT 1 FROM abonnements_transport
      WHERE ecole_id=NEW.ecole_id AND eleve_id=NEW.eleve_id AND annee_id=NEW.annee_id
        AND statut='actif' AND id <> NEW.id) INTO v_existe;
  END IF;

  IF v_existe THEN
    RAISE EXCEPTION 'abonnement_deja_actif:%', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_classe_capacite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cap int; v_nom text; v_inscrits int; v_derogation boolean := false;
BEGIN
  IF NEW.classe_id IS NULL THEN RETURN NEW; END IF;

  -- Controle uniquement a l'inscription, au changement de classe,
  -- ou au passage de pre-inscrit a inscrit.
  IF TG_OP = 'UPDATE'
     AND NEW.classe_id IS NOT DISTINCT FROM OLD.classe_id
     AND NOT (NEW.statut = 'inscrit' AND OLD.statut IS DISTINCT FROM 'inscrit') THEN
    RETURN NEW;
  END IF;

  -- Une pre-inscription ne consomme pas de place.
  IF NEW.statut IS DISTINCT FROM 'inscrit' THEN RETURN NEW; END IF;

  SELECT capacite, nom INTO v_cap, v_nom FROM classes WHERE id = NEW.classe_id;
  IF v_cap IS NULL OR v_cap <= 0 THEN RETURN NEW; END IF;

  -- Seuls les eleves REELLEMENT INSCRITS occupent une place.
  SELECT count(*) INTO v_inscrits
  FROM eleves e
  WHERE e.classe_id = NEW.classe_id
    AND e.annee_id IS NOT DISTINCT FROM NEW.annee_id
    AND e.statut = 'inscrit'
    AND e.id <> NEW.id;

  IF v_inscrits >= v_cap THEN
    v_derogation :=
      private.has_ecole_role(auth.uid(), NEW.ecole_id, 'admin'::app_role)
      OR private.has_ecole_role(auth.uid(), NEW.ecole_id, 'directeur'::app_role);

    IF NOT v_derogation THEN
      RAISE EXCEPTION 'classe_pleine:%:%:%', v_nom, v_inscrits, v_cap
        USING HINT = 'Un administrateur ou le directeur peut autoriser le depassement.';
    END IF;

    -- Depassement autorise : on trace la decision.
    INSERT INTO audit_logs (ecole_id, user_id, action, cible, niveau, details)
    VALUES (NEW.ecole_id, auth.uid(), 'classe.depassement_capacite', NEW.classe_id::text, 'warning',
            jsonb_build_object('classe', v_nom, 'capacite', v_cap,
                               'inscrits_avant', v_inscrits, 'eleve_id', NEW.id));
  END IF;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_classe_capacite_coherente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_inscrits int;
BEGIN
  IF NEW.capacite IS NULL OR NEW.capacite <= 0 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.capacite >= COALESCE(OLD.capacite, 0) THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_inscrits
  FROM eleves e
  WHERE e.classe_id = NEW.id
    AND e.annee_id IS NOT DISTINCT FROM NEW.annee_id
    AND e.statut = 'inscrit';

  IF NEW.capacite < v_inscrits THEN
    RAISE EXCEPTION 'capacite_inferieure_effectif:%:%:%', NEW.nom, v_inscrits, NEW.capacite
      USING HINT = 'Transferez des eleves avant de reduire la capacite.';
  END IF;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_date_paiement_plausible()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_col text := TG_ARGV[0];
  v_date date;
BEGIN
  -- Lecture generique : evite toute reference statique a une colonne
  -- qui n'existe pas sur la table concernee.
  v_date := (to_jsonb(NEW) ->> v_col)::date;
  IF v_date IS NULL THEN RETURN NEW; END IF;

  IF v_date < DATE '2020-01-01' OR v_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'date_invraisemblable:%', v_date
      USING HINT = 'Verifiez la date saisie.';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_facture_annulee_coherente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_actifs numeric;
BEGIN
  IF NEW.statut <> 'annulee' OR OLD.statut = 'annulee' THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_actifs
  FROM paiements WHERE facture_id = NEW.id AND annule_le IS NULL;

  IF v_actifs > 0 THEN
    RAISE EXCEPTION 'facture_avec_reglement_actif:%:%', NEW.numero, v_actifs
      USING HINT = 'Annulez d''abord le ou les reglements de cette facture.';
  END IF;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_paiements_invariants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref numeric;
  v_autres numeric;
BEGIN
  IF NEW.montant IS NULL OR NEW.montant <= 0 THEN
    RAISE EXCEPTION 'Montant de paiement invalide (doit etre strictement positif)';
  END IF;
  IF NEW.annule_le IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.tranche_id IS NOT NULL THEN
    SELECT montant INTO v_ref FROM public.tranches WHERE id = NEW.tranche_id;
    IF v_ref IS NOT NULL THEN
      SELECT COALESCE(SUM(montant), 0) INTO v_autres FROM public.paiements
      WHERE tranche_id = NEW.tranche_id AND annule_le IS NULL
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
      IF v_autres + NEW.montant > v_ref THEN
        RAISE EXCEPTION 'Surpaiement interdit sur la tranche (% + % > %)', v_autres, NEW.montant, v_ref;
      END IF;
    END IF;
  END IF;
  IF NEW.facture_id IS NOT NULL THEN
    SELECT montant INTO v_ref FROM public.factures WHERE id = NEW.facture_id;
    IF v_ref IS NOT NULL THEN
      SELECT COALESCE(SUM(montant), 0) INTO v_autres FROM public.paiements
      WHERE facture_id = NEW.facture_id AND annule_le IS NULL
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
      IF v_autres + NEW.montant > v_ref THEN
        RAISE EXCEPTION 'Surpaiement interdit sur la facture (% + % > %)', v_autres, NEW.montant, v_ref;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_tranches_montant_coherent()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_excedent_avant numeric := 0;
  v_excedent_apres numeric;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_excedent_avant := GREATEST(COALESCE(OLD.paye,0) - COALESCE(OLD.montant,0), 0);
  END IF;
  v_excedent_apres := GREATEST(COALESCE(NEW.paye,0) - COALESCE(NEW.montant,0), 0);

  -- On bloque uniquement l'AGGRAVATION : les ecarts historiques restent
  -- modifiables et peuvent etre resorbes, mais aucun nouvel excedent
  -- ne peut apparaitre ni grandir.
  IF v_excedent_apres > v_excedent_avant THEN
    RAISE EXCEPTION 'montant_tranche_sous_paye: tranche % — montant % inferieur au deja paye % (excedent % -> %)',
      NEW.numero, NEW.montant, NEW.paye, v_excedent_avant, v_excedent_apres;
  END IF;

  RETURN NEW;
END; $function$;

-- Création conditionnelle des triggers -> no-op strict en production.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('abonnements_cantine',  'trg_abo_unique',                'BEFORE INSERT OR UPDATE ON public.abonnements_cantine FOR EACH ROW EXECUTE FUNCTION public.trg_abonnement_service_unique()'),
      ('abonnements_transport','trg_abo_unique',                'BEFORE INSERT OR UPDATE ON public.abonnements_transport FOR EACH ROW EXECUTE FUNCTION public.trg_abonnement_service_unique()'),
      ('classes',              'trg_classe_capacite_coherente', 'BEFORE INSERT OR UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.trg_classe_capacite_coherente()'),
      ('depenses',             'trg_date_plausible',            'BEFORE INSERT OR UPDATE ON public.depenses FOR EACH ROW EXECUTE FUNCTION public.trg_date_paiement_plausible(''date_depense'')'),
      ('eleves',               'trg_classe_capacite',           'BEFORE INSERT OR UPDATE ON public.eleves FOR EACH ROW EXECUTE FUNCTION public.trg_classe_capacite()'),
      ('factures',             'trg_facture_annulee_coherente', 'BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.trg_facture_annulee_coherente()'),
      ('paiements',            'trg_date_plausible',            'BEFORE INSERT OR UPDATE ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.trg_date_paiement_plausible(''date_paiement'')'),
      ('paiements',            'trg_paiements_invariants',      'BEFORE INSERT OR UPDATE ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.trg_paiements_invariants()'),
      ('tranches',             'trg_tranches_montant_coherent', 'BEFORE INSERT OR UPDATE ON public.tranches FOR EACH ROW EXECUTE FUNCTION public.trg_tranches_montant_coherent()'),
      ('vacances_paiements',   'trg_date_plausible',            'BEFORE INSERT OR UPDATE ON public.vacances_paiements FOR EACH ROW EXECUTE FUNCTION public.trg_date_paiement_plausible(''date_paiement'')')
    ) AS x(tbl, trg, def)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname=r.tbl AND t.tgname=r.trg
    ) THEN
      EXECUTE format('CREATE TRIGGER %I %s', r.trg, r.def);
    END IF;
  END LOOP;
END $$;
