ALTER TABLE public.abonnements_cantine
  ADD COLUMN IF NOT EXISTS date_debut date,
  ADD COLUMN IF NOT EXISTS date_fin_effet date,
  ADD COLUMN IF NOT EXISTS motif_resiliation text,
  ADD COLUMN IF NOT EXISTS derniere_relance_at timestamptz;

ALTER TABLE public.abonnements_transport
  ADD COLUMN IF NOT EXISTS date_debut date,
  ADD COLUMN IF NOT EXISTS date_fin_effet date,
  ADD COLUMN IF NOT EXISTS motif_resiliation text,
  ADD COLUMN IF NOT EXISTS derniere_relance_at timestamptz;

CREATE OR REPLACE FUNCTION public.resilier_abonnement_service(
  _abonnement_id uuid,
  _service_type text,
  _date_effet date DEFAULT CURRENT_DATE,
  _motif text DEFAULT NULL,
  _statut text DEFAULT 'resilie'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ecole uuid; v_eleve uuid; v_annee uuid;
  v_factures_annulees int := 0;
  v_echeances_supprimees int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF _service_type NOT IN ('cantine','transport') THEN RAISE EXCEPTION 'Service inconnu'; END IF;
  IF _statut NOT IN ('resilie','suspendu') THEN RAISE EXCEPTION 'Statut inconnu'; END IF;

  IF _service_type = 'cantine' THEN
    SELECT ecole_id, eleve_id, annee_id INTO v_ecole, v_eleve, v_annee
    FROM abonnements_cantine WHERE id = _abonnement_id;
  ELSE
    SELECT ecole_id, eleve_id, annee_id INTO v_ecole, v_eleve, v_annee
    FROM abonnements_transport WHERE id = _abonnement_id;
  END IF;

  IF v_ecole IS NULL THEN RAISE EXCEPTION 'Abonnement introuvable'; END IF;

  IF NOT (private.has_ecole_role(auth.uid(), v_ecole, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ecole, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), v_ecole, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF _service_type = 'cantine' THEN
    UPDATE abonnements_cantine
       SET statut = _statut,
           date_fin_effet = _date_effet,
           motif_resiliation = _motif,
           updated_at = now()
     WHERE id = _abonnement_id;
  ELSE
    UPDATE abonnements_transport
       SET statut = _statut,
           date_fin_effet = _date_effet,
           motif_resiliation = _motif
     WHERE id = _abonnement_id;
  END IF;

  -- Résiliation : on annule ce qui n'est pas encore échu et non payé.
  IF _statut = 'resilie' THEN
    WITH upd AS (
      UPDATE factures f
         SET statut = 'annulee', updated_at = now(),
             notes = COALESCE(f.notes || ' | ', '') || 'Annulée (résiliation ' || _service_type || ' au ' || to_char(_date_effet,'DD/MM/YYYY') || ')'
       WHERE f.ecole_id = v_ecole
         AND f.eleve_id = v_eleve
         AND f.annee_id = v_annee
         AND f.categorie = _service_type
         AND f.statut <> 'annulee'
         AND COALESCE(f.montant_paye, 0) = 0
         AND f.date_echeance > _date_effet
      RETURNING 1
    )
    SELECT count(*) INTO v_factures_annulees FROM upd;

    WITH del AS (
      DELETE FROM echeances_services e
       WHERE e.ecole_id = v_ecole
         AND e.eleve_id = v_eleve
         AND e.annee_id = v_annee
         AND e.service_type = _service_type
         AND COALESCE(e.paye, 0) = 0
         AND e.echeance > _date_effet
      RETURNING 1
    )
    SELECT count(*) INTO v_echeances_supprimees FROM del;
  END IF;

  RETURN jsonb_build_object(
    'statut', _statut,
    'date_effet', _date_effet,
    'factures_annulees', v_factures_annulees,
    'echeances_supprimees', v_echeances_supprimees
  );
END; $function$;

REVOKE ALL ON FUNCTION public.resilier_abonnement_service(uuid, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resilier_abonnement_service(uuid, text, date, text, text) TO authenticated;

-- La génération de factures ignore les abonnements résiliés / suspendus.
CREATE OR REPLACE FUNCTION public.generer_factures_service(_ecole_id uuid, _abonnement_id uuid, _service_type text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_annee UUID;
  v_eleve UUID;
  v_grille UUID;
  v_statut TEXT;
  v_libelle TEXT;
  v_tranches JSONB;
  v_periodicite TEXT;
  v_annee_debut INT;
  v_tr JSONB;
  v_numero TEXT;
  v_montant NUMERIC;
  v_date DATE;
  v_label TEXT;
  v_prefix TEXT;
  v_count INT := 0;
BEGIN
  v_prefix := CASE WHEN _service_type = 'cantine' THEN 'CTN' ELSE 'TRP' END;

  IF _service_type = 'cantine' THEN
    SELECT a.annee_id, a.eleve_id, a.grille_id, a.statut
      INTO v_annee, v_eleve, v_grille, v_statut
    FROM abonnements_cantine a WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  ELSE
    SELECT a.annee_id, a.eleve_id, a.grille_id, a.statut
      INTO v_annee, v_eleve, v_grille, v_statut
    FROM abonnements_transport a WHERE a.id = _abonnement_id AND a.ecole_id = _ecole_id;
  END IF;

  IF v_statut IS DISTINCT FROM 'actif' THEN
    RETURN 0;
  END IF;

  IF v_grille IS NULL THEN
    RAISE EXCEPTION 'Aucun tarif rattaché à cet abonnement. Choisissez un tarif avant de générer les factures.';
  END IF;

  SELECT g.libelle, g.tranches, g.periodicite
    INTO v_libelle, v_tranches, v_periodicite
  FROM grille_tarifs_services g WHERE g.id = v_grille;

  SELECT EXTRACT(YEAR FROM COALESCE(a.debut, CURRENT_DATE))::INT
    INTO v_annee_debut
  FROM annees_scolaires a WHERE a.id = v_annee;
  v_annee_debut := COALESCE(v_annee_debut, EXTRACT(YEAR FROM now())::INT);

  FOR v_tr IN SELECT * FROM jsonb_array_elements(COALESCE(v_tranches, '[]'::jsonb))
  LOOP
    v_montant := COALESCE((v_tr->>'montant')::NUMERIC, 0);
    v_label := COALESCE(v_tr->>'label', 'Tranche ' || COALESCE(v_tr->>'numero','?'));
    BEGIN
      v_date := make_date(
        CASE WHEN COALESCE((v_tr->>'mois')::INT, 9) < 7 THEN v_annee_debut + 1 ELSE v_annee_debut END,
        COALESCE((v_tr->>'mois')::INT, 9),
        LEAST(COALESCE((v_tr->>'jour')::INT, 1), 28)
      );
    EXCEPTION WHEN OTHERS THEN v_date := CURRENT_DATE; END;

    v_numero := v_prefix || '-' || substr(_abonnement_id::TEXT, 1, 8) || '-' || COALESCE(v_tr->>'numero', v_count::TEXT);

    IF NOT EXISTS (SELECT 1 FROM factures WHERE ecole_id = _ecole_id AND numero = v_numero) THEN
      INSERT INTO factures (ecole_id, eleve_id, annee_id, numero, libelle, montant, date_echeance, statut, categorie)
      VALUES (_ecole_id, v_eleve, v_annee, v_numero,
              v_libelle || ' — ' || v_label,
              v_montant, v_date, 'emise', _service_type);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END $function$;