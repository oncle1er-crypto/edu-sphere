-- Production hardening for the Cantine and Transport modules.
-- Aligns database authorization with the effective module permissions used by the UI.

CREATE OR REPLACE FUNCTION private.has_effective_permission(
  _user_id uuid,
  _ecole_id uuid,
  _module_key text,
  _action text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL OR _ecole_id IS NULL THEN false
    WHEN private.has_ecole_role(_user_id, _ecole_id, 'admin'::public.app_role) THEN true
    ELSE COALESCE(
      (
        SELECT CASE _action
          WHEN 'view' THEN up.can_view
          WHEN 'create' THEN up.can_create
          WHEN 'update' THEN up.can_update
          WHEN 'delete' THEN up.can_delete
          WHEN 'export' THEN up.can_export
          ELSE false
        END
        FROM public.user_permissions up
        WHERE up.user_id = _user_id
          AND up.ecole_id = _ecole_id
          AND up.module_key = _module_key
      ),
      (
        SELECT bool_or(CASE _action
          WHEN 'view' THEN rp.can_view
          WHEN 'create' THEN rp.can_create
          WHEN 'update' THEN rp.can_update
          WHEN 'delete' THEN rp.can_delete
          WHEN 'export' THEN rp.can_export
          ELSE false
        END)
        FROM public.user_roles ur
        JOIN public.role_permissions rp
          ON rp.ecole_id = ur.ecole_id
         AND rp.role = ur.role
         AND rp.module_key = _module_key
        WHERE ur.user_id = _user_id
          AND ur.ecole_id = _ecole_id
      ),
      false
    )
  END;
$function$;

REVOKE ALL ON FUNCTION private.has_effective_permission(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_effective_permission(uuid, uuid, text, text) TO authenticated, service_role;

-- Replace broad membership-only write access with the same effective permissions
-- that drive the Cantine UI. Reading remains limited to school members.
DO $policies$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['cantine_incidents', 'cantine_planning', 'cantine_personnel']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_ecole', target_table);
    EXECUTE format('DROP POLICY IF EXISTS cantine_module_read ON public.%I', target_table);
    EXECUTE format('DROP POLICY IF EXISTS cantine_module_insert ON public.%I', target_table);
    EXECUTE format('DROP POLICY IF EXISTS cantine_module_update ON public.%I', target_table);
    EXECUTE format('DROP POLICY IF EXISTS cantine_module_delete ON public.%I', target_table);

    EXECUTE format(
      'CREATE POLICY cantine_module_read ON public.%I FOR SELECT TO authenticated USING (private.user_belongs_to_ecole((SELECT auth.uid()), ecole_id) AND private.has_effective_permission((SELECT auth.uid()), ecole_id, ''cantine'', ''view''))',
      target_table
    );
    EXECUTE format(
      'CREATE POLICY cantine_module_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (private.has_effective_permission((SELECT auth.uid()), ecole_id, ''cantine'', ''create''))',
      target_table
    );
    EXECUTE format(
      'CREATE POLICY cantine_module_update ON public.%I FOR UPDATE TO authenticated USING (private.has_effective_permission((SELECT auth.uid()), ecole_id, ''cantine'', ''update'')) WITH CHECK (private.has_effective_permission((SELECT auth.uid()), ecole_id, ''cantine'', ''update''))',
      target_table
    );
    EXECUTE format(
      'CREATE POLICY cantine_module_delete ON public.%I FOR DELETE TO authenticated USING (private.has_effective_permission((SELECT auth.uid()), ecole_id, ''cantine'', ''delete''))',
      target_table
    );
  END LOOP;
END
$policies$;

-- The database, not the browser, owns the authoritative fuel amount.
CREATE OR REPLACE FUNCTION public.normalize_transport_carburant_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.montant := round(NEW.litres * NEW.prix_litre);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_normalize_transport_carburant_amount ON public.transport_carburant;
CREATE TRIGGER trg_normalize_transport_carburant_amount
BEFORE INSERT OR UPDATE OF litres, prix_litre, montant ON public.transport_carburant
FOR EACH ROW EXECUTE FUNCTION public.normalize_transport_carburant_amount();

ALTER TABLE public.cantine_planning
  ADD CONSTRAINT cantine_planning_effectifs_non_negatifs
  CHECK (
    COALESCE(capacite_prevue, 0) >= 0
    AND COALESCE(effectif_inscrits, 0) >= 0
    AND COALESCE(effectif_realise, 0) >= 0
  ) NOT VALID;

-- SECURITY DEFINER is required to create invoices atomically, therefore every
-- caller and every supplied school/subscription identifier is checked explicitly.
CREATE OR REPLACE FUNCTION public.generer_factures_service(
  _ecole_id uuid,
  _abonnement_id uuid,
  _service_type text,
  _forcer boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_is_service_role boolean := current_user = 'service_role';
  v_annee uuid; v_eleve uuid; v_grille uuid; v_statut text;
  v_libelle text; v_tranches jsonb; v_annee_debut int;
  v_tr jsonb; v_numero text; v_montant numeric; v_date date; v_label text;
  v_prefix text;
  v_open_numero text; v_open_echeance date;
BEGIN
  IF v_user IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'authentification_requise' USING ERRCODE = '42501';
  END IF;

  IF _service_type NOT IN ('cantine', 'transport') THEN
    RAISE EXCEPTION 'service_inconnu';
  END IF;

  IF NOT v_is_service_role AND NOT private.has_effective_permission(v_user, _ecole_id, _service_type, 'create') THEN
    RAISE EXCEPTION 'permission_facturation_refusee' USING ERRCODE = '42501';
  END IF;

  -- Serialise invoice generation for one subscription across all clients.
  PERFORM pg_advisory_xact_lock(hashtextextended(_service_type || ':' || _abonnement_id::text, 0));

  v_prefix := CASE WHEN _service_type = 'cantine' THEN 'CTN' ELSE 'TRP' END;

  IF _service_type = 'cantine' THEN
    SELECT a.annee_id, a.eleve_id, a.grille_id, a.statut
      INTO v_annee, v_eleve, v_grille, v_statut
    FROM public.abonnements_cantine a
    WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  ELSE
    SELECT a.annee_id, a.eleve_id, a.grille_id, a.statut
      INTO v_annee, v_eleve, v_grille, v_statut
    FROM public.abonnements_transport a
    WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  END IF;

  IF v_annee IS NULL OR v_statut IS DISTINCT FROM 'actif' THEN RETURN 0; END IF;
  IF v_grille IS NULL THEN
    RAISE EXCEPTION 'Aucun tarif rattaché à cet abonnement. Choisissez un tarif avant de générer les factures.';
  END IF;

  SELECT f.numero, f.date_echeance INTO v_open_numero, v_open_echeance
  FROM public.factures f
  WHERE f.ecole_id = _ecole_id AND f.eleve_id = v_eleve AND f.annee_id = v_annee
    AND f.categorie = _service_type AND f.statut <> 'annulee'
    AND COALESCE(f.montant_paye, 0) < f.montant
  ORDER BY f.date_echeance LIMIT 1;

  IF v_open_numero IS NOT NULL THEN
    RAISE EXCEPTION 'facture_precedente_non_soldee:%:%', v_open_numero, to_char(v_open_echeance, 'DD/MM/YYYY');
  END IF;

  SELECT g.libelle, g.tranches INTO v_libelle, v_tranches
  FROM public.grille_tarifs_services g
  WHERE g.id = v_grille AND g.ecole_id = _ecole_id AND g.service_type = _service_type;

  IF v_tranches IS NULL THEN
    RAISE EXCEPTION 'grille_tarif_invalide';
  END IF;

  SELECT EXTRACT(YEAR FROM COALESCE(a.debut, CURRENT_DATE))::int INTO v_annee_debut
  FROM public.annees_scolaires a WHERE a.id = v_annee AND a.ecole_id = _ecole_id;
  v_annee_debut := COALESCE(v_annee_debut, EXTRACT(YEAR FROM now())::int);

  FOR v_tr IN
    SELECT t FROM jsonb_array_elements(COALESCE(v_tranches, '[]'::jsonb)) AS t
    ORDER BY COALESCE((t->>'numero')::int, 999)
  LOOP
    v_numero := v_prefix || '-' || substr(_abonnement_id::text, 1, 8) || '-' || COALESCE(v_tr->>'numero', '0');
    IF EXISTS (SELECT 1 FROM public.factures WHERE ecole_id = _ecole_id AND numero = v_numero AND statut <> 'annulee') THEN CONTINUE; END IF;

    v_montant := COALESCE((v_tr->>'montant')::numeric, 0);
    IF v_montant <= 0 THEN RAISE EXCEPTION 'montant_tranche_invalide'; END IF;
    v_label := COALESCE(v_tr->>'label', 'Tranche ' || COALESCE(v_tr->>'numero', '?'));
    BEGIN
      v_date := make_date(
        CASE WHEN COALESCE((v_tr->>'mois')::int, 9) < 7 THEN v_annee_debut + 1 ELSE v_annee_debut END,
        COALESCE((v_tr->>'mois')::int, 9), LEAST(GREATEST(COALESCE((v_tr->>'jour')::int, 1), 1), 28)
      );
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION 'date_tranche_invalide';
    END;

    IF v_date > CURRENT_DATE AND NOT COALESCE(_forcer, false) THEN RETURN 0; END IF;
    IF EXISTS (SELECT 1 FROM public.factures WHERE ecole_id = _ecole_id AND numero = v_numero) THEN
      v_numero := v_numero || '-R' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    END IF;

    INSERT INTO public.factures (ecole_id, eleve_id, annee_id, numero, libelle, montant, date_echeance, statut, categorie)
    VALUES (_ecole_id, v_eleve, v_annee, v_numero, v_libelle || ' — ' || v_label, v_montant, v_date, 'emise', _service_type);

    UPDATE public.echeances_services
    SET statut = CASE WHEN v_date < CURRENT_DATE THEN 'retard' ELSE 'due' END, updated_at = now()
    WHERE ecole_id = _ecole_id AND eleve_id = v_eleve AND annee_id = v_annee
      AND service_type = _service_type AND numero = COALESCE((v_tr->>'numero')::int, -1);
    RETURN 1;
  END LOOP;
  RETURN 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.generer_factures_service(uuid, uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generer_factures_service(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.generer_factures_service(uuid, uuid, text, boolean) TO authenticated, service_role;
