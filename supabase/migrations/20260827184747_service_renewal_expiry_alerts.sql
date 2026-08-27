-- The service due date represents the end of the paid coverage period.
-- Each tariff controls how many days before that date staff are warned.
ALTER TABLE public.grille_tarifs_services
  ADD COLUMN IF NOT EXISTS jours_alerte_renouvellement integer NOT NULL DEFAULT 7;

ALTER TABLE public.grille_tarifs_services
  DROP CONSTRAINT IF EXISTS grille_tarifs_services_jours_alerte_check;

ALTER TABLE public.grille_tarifs_services
  ADD CONSTRAINT grille_tarifs_services_jours_alerte_check
  CHECK (jours_alerte_renouvellement BETWEEN 1 AND 30) NOT VALID;

ALTER TABLE public.grille_tarifs_services
  VALIDATE CONSTRAINT grille_tarifs_services_jours_alerte_check;

COMMENT ON COLUMN public.grille_tarifs_services.jours_alerte_renouvellement IS
  'Nombre de jours avant la fin de validite payee pour alerter le personnel.';

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS date_fin_validite date;

COMMENT ON COLUMN public.factures.date_fin_validite IS
  'Fin de la couverture payee pour une facture cantine ou transport. Distincte de la date limite de paiement.';

CREATE OR REPLACE FUNCTION private.service_invoice_coverage_end(
  _ecole_id uuid,
  _eleve_id uuid,
  _annee_id uuid,
  _service_type text,
  _numero_facture text,
  _date_echeance date
) RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public, private
AS $function$
DECLARE
  v_tranches jsonb;
  v_numero integer;
  v_next jsonb;
  v_annee_debut integer;
  v_annee_fin date;
  v_mois integer;
  v_jour integer;
  v_dernier_jour integer;
  v_date_suivante date;
BEGIN
  IF _service_type NOT IN ('cantine', 'transport') THEN
    RETURN NULL;
  END IF;

  v_numero := substring(_numero_facture from '-([0-9]+)(-R[0-9]+)?$')::integer;
  IF v_numero IS NULL THEN
    RETURN _date_echeance;
  END IF;

  IF _service_type = 'cantine' THEN
    SELECT g.tranches INTO v_tranches
    FROM public.abonnements_cantine a
    JOIN public.grille_tarifs_services g ON g.id = a.grille_id
    WHERE a.ecole_id = _ecole_id
      AND a.eleve_id = _eleve_id
      AND a.annee_id = _annee_id
      AND _numero_facture LIKE 'CTN-' || substr(a.id::text, 1, 8) || '-%'
    LIMIT 1;
  ELSE
    SELECT g.tranches INTO v_tranches
    FROM public.abonnements_transport a
    JOIN public.grille_tarifs_services g ON g.id = a.grille_id
    WHERE a.ecole_id = _ecole_id
      AND a.eleve_id = _eleve_id
      AND a.annee_id = _annee_id
      AND _numero_facture LIKE 'TRP-' || substr(a.id::text, 1, 8) || '-%'
    LIMIT 1;
  END IF;

  SELECT extract(year FROM coalesce(a.debut, _date_echeance))::integer, a.fin
    INTO v_annee_debut, v_annee_fin
  FROM public.annees_scolaires a
  WHERE a.id = _annee_id AND a.ecole_id = _ecole_id;
  v_annee_debut := coalesce(v_annee_debut, extract(year FROM _date_echeance)::integer);

  SELECT t INTO v_next
  FROM jsonb_array_elements(coalesce(v_tranches, '[]'::jsonb)) t
  WHERE coalesce((t->>'numero')::integer, 999) > v_numero
  ORDER BY coalesce((t->>'numero')::integer, 999)
  LIMIT 1;

  IF v_next IS NULL THEN
    RETURN greatest(coalesce(v_annee_fin, _date_echeance), _date_echeance);
  END IF;

  v_mois := least(12, greatest(1, coalesce((v_next->>'mois')::integer, 1)));
  v_jour := greatest(1, coalesce((v_next->>'jour')::integer, 1));
  v_dernier_jour := extract(day FROM (make_date(
    CASE WHEN v_mois < 7 THEN v_annee_debut + 1 ELSE v_annee_debut END,
    v_mois,
    1
  ) + interval '1 month - 1 day'))::integer;
  v_date_suivante := make_date(
    CASE WHEN v_mois < 7 THEN v_annee_debut + 1 ELSE v_annee_debut END,
    v_mois,
    least(v_jour, v_dernier_jour)
  );

  RETURN greatest(v_date_suivante, _date_echeance);
END;
$function$;

REVOKE ALL ON FUNCTION private.service_invoice_coverage_end(uuid, uuid, uuid, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.service_invoice_coverage_end(uuid, uuid, uuid, text, text, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.normalize_service_invoice_coverage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $function$
BEGIN
  IF NEW.categorie IN ('cantine', 'transport') THEN
    NEW.date_fin_validite := private.service_invoice_coverage_end(
      NEW.ecole_id,
      NEW.eleve_id,
      NEW.annee_id,
      NEW.categorie,
      NEW.numero,
      NEW.date_echeance
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.normalize_service_invoice_coverage() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_normalize_service_invoice_coverage ON public.factures;
CREATE TRIGGER trg_normalize_service_invoice_coverage
BEFORE INSERT OR UPDATE OF numero, date_echeance, categorie, eleve_id, annee_id
ON public.factures
FOR EACH ROW EXECUTE FUNCTION public.normalize_service_invoice_coverage();

UPDATE public.factures f
SET date_fin_validite = private.service_invoice_coverage_end(
  f.ecole_id, f.eleve_id, f.annee_id, f.categorie, f.numero, f.date_echeance
)
WHERE f.categorie IN ('cantine', 'transport')
  AND f.date_fin_validite IS NULL;

ALTER TABLE public.factures
  DROP CONSTRAINT IF EXISTS factures_service_validite_apres_echeance;

ALTER TABLE public.factures
  ADD CONSTRAINT factures_service_validite_apres_echeance
  CHECK (
    categorie NOT IN ('cantine', 'transport')
    OR date_fin_validite IS NULL
    OR date_fin_validite >= date_echeance
  ) NOT VALID;

ALTER TABLE public.factures
  VALIDATE CONSTRAINT factures_service_validite_apres_echeance;

CREATE INDEX IF NOT EXISTS idx_factures_service_fin_validite
  ON public.factures (ecole_id, categorie, date_fin_validite)
  WHERE categorie IN ('cantine', 'transport') AND statut <> 'annulee';
