-- Comptabilise la paie dès la validation du bulletin, puis réutilise les
-- mêmes écritures au paiement afin d'éviter toute double sortie.

ALTER TABLE public.bulletins_paie
  ADD COLUMN IF NOT EXISTS depense_charges_id uuid
  REFERENCES public.depenses(id) ON DELETE SET NULL;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.bulletins_paie'::regclass
       AND conname = 'bulletins_paie_depense_id_fkey'
  ) THEN
    ALTER TABLE public.bulletins_paie
      ADD CONSTRAINT bulletins_paie_depense_id_fkey
      FOREIGN KEY (depense_id) REFERENCES public.depenses(id) ON DELETE SET NULL;
  END IF;
END;
$do$;

CREATE INDEX IF NOT EXISTS bulletins_paie_depense_id_idx
  ON public.bulletins_paie(depense_id)
  WHERE depense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bulletins_paie_depense_charges_id_idx
  ON public.bulletins_paie(depense_charges_id)
  WHERE depense_charges_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.rh_comptabiliser_bulletin(
  _bulletin_id uuid,
  _acteur_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  b public.bulletins_paie%ROWTYPE;
  p RECORD;
  v_depense_salaire uuid;
  v_depense_charges uuid;
  v_date_comptable date;
  v_suffixe text;
BEGIN
  SELECT * INTO b
    FROM public.bulletins_paie
   WHERE id = _bulletin_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'bulletin_introuvable'; END IF;

  SELECT nom, prenom, matricule INTO p
    FROM public.enseignants
   WHERE id = b.enseignant_id;

  v_date_comptable := (
    make_date(b.annee, b.mois, 1) + interval '1 month' - interval '1 day'
  )::date;
  v_suffixe := upper(substr(replace(_bulletin_id::text, '-', ''), 1, 12));
  v_depense_salaire := b.depense_id;
  v_depense_charges := b.depense_charges_id;

  IF v_depense_salaire IS NULL THEN
    INSERT INTO public.depenses (
      ecole_id, reference, libelle, categorie, montant, date_depense, statut,
      notes, enregistre_par, valide_par, valide_le
    ) VALUES (
      b.ecole_id,
      'PAY-' || v_suffixe,
      'Salaire brut ' || lpad(b.mois::text, 2, '0') || '/' || b.annee
        || ' - ' || coalesce(p.nom, '') || ' ' || coalesce(p.prenom, ''),
      'Salaires et charges du personnel',
      b.total_gains,
      v_date_comptable,
      'validee',
      'Écriture générée automatiquement à la validation du bulletin de paie ' || b.id,
      _acteur_id, _acteur_id, now()
    )
    RETURNING id INTO v_depense_salaire;
  END IF;

  IF coalesce(b.total_charges_patronales, 0) > 0 AND v_depense_charges IS NULL THEN
    INSERT INTO public.depenses (
      ecole_id, reference, libelle, categorie, montant, date_depense, statut,
      notes, enregistre_par, valide_par, valide_le
    ) VALUES (
      b.ecole_id,
      'PAY-CHG-' || v_suffixe,
      'Charges patronales ' || lpad(b.mois::text, 2, '0') || '/' || b.annee
        || ' - ' || coalesce(p.nom, '') || ' ' || coalesce(p.prenom, ''),
      'CNPS',
      b.total_charges_patronales,
      v_date_comptable,
      'validee',
      'Écriture générée automatiquement à la validation du bulletin de paie ' || b.id,
      _acteur_id, _acteur_id, now()
    )
    RETURNING id INTO v_depense_charges;
  END IF;

  UPDATE public.bulletins_paie
     SET depense_id = v_depense_salaire,
         depense_charges_id = v_depense_charges,
         updated_at = now()
   WHERE id = _bulletin_id;

  RETURN jsonb_build_object(
    'depense_salaire_id', v_depense_salaire,
    'depense_charges_id', v_depense_charges,
    'date_comptable', v_date_comptable
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.rh_comptabiliser_bulletin(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.rh_valider_bulletin(_bulletin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b public.bulletins_paie%ROWTYPE;
  compta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO b FROM public.bulletins_paie WHERE id = _bulletin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'bulletin_introuvable'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), b.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'directeur'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF b.statut = 'paye' THEN RAISE EXCEPTION 'bulletin_deja_paye'; END IF;

  compta := private.rh_comptabiliser_bulletin(_bulletin_id, auth.uid());

  UPDATE public.bulletins_paie
     SET statut = 'valide',
         valide_le = coalesce(valide_le, now()),
         valide_par = coalesce(valide_par, auth.uid()),
         updated_at = now()
   WHERE id = _bulletin_id;

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    b.ecole_id, auth.uid(), 'paie.valider', _bulletin_id::text, 'info',
    jsonb_build_object('mois', b.mois, 'annee', b.annee, 'net', b.net_a_payer)
      || compta
  );
  RETURN jsonb_build_object('ok', true, 'statut', 'valide') || compta;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rh_payer_bulletin(
  _bulletin_id uuid,
  _date_paiement date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b public.bulletins_paie%ROWTYPE;
  compta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO b FROM public.bulletins_paie WHERE id = _bulletin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'bulletin_introuvable'; END IF;
  IF NOT (private.has_ecole_role(auth.uid(), b.ecole_id, 'admin'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'directeur'::app_role)
       OR private.has_ecole_role(auth.uid(), b.ecole_id, 'comptable'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF b.statut = 'paye' THEN RAISE EXCEPTION 'bulletin_deja_paye'; END IF;
  IF b.statut <> 'valide' THEN RAISE EXCEPTION 'bulletin_non_valide'; END IF;

  -- Compatibilité avec les bulletins validés avant cette migration : crée
  -- uniquement les écritures qui manquent, sans jamais dupliquer l'existant.
  compta := private.rh_comptabiliser_bulletin(_bulletin_id, auth.uid());

  UPDATE public.bulletins_paie
     SET statut = 'paye', date_paiement = _date_paiement, updated_at = now()
   WHERE id = _bulletin_id;

  INSERT INTO public.audit_logs (ecole_id, user_id, action, cible, niveau, details)
  VALUES (
    b.ecole_id, auth.uid(), 'paie.payer', _bulletin_id::text, 'warning',
    jsonb_build_object(
      'mois', b.mois, 'annee', b.annee, 'net', b.net_a_payer,
      'date_paiement', _date_paiement
    ) || compta
  );

  RETURN jsonb_build_object('ok', true, 'statut', 'paye') || compta;
END;
$function$;

REVOKE ALL ON FUNCTION public.rh_valider_bulletin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_payer_bulletin(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_valider_bulletin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_payer_bulletin(uuid, date) TO authenticated;
