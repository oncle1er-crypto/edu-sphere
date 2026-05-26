
DROP FUNCTION IF EXISTS public.appliquer_decisions_fin_annee(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.appliquer_decisions_fin_annee(
  _ecole_id UUID,
  _annee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count_applied INT := 0;
  _count_parcours INT := 0;
  _rec RECORD;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF NOT (private.has_ecole_role(_uid, _ecole_id, 'admin')
       OR private.has_ecole_role(_uid, _ecole_id, 'directeur')) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  FOR _rec IN
    SELECT d.id, d.eleve_id, d.classe_origine_id, d.decision, d.classe_destination_id
    FROM decisions_fin_annee d
    WHERE d.ecole_id = _ecole_id
      AND d.annee_id = _annee_id
      AND d.statut = 'verrouille'
  LOOP
    INSERT INTO parcours_scolaire (ecole_id, eleve_id, annee_id, classe_id, decision, classe_destination_id)
    VALUES (_ecole_id, _rec.eleve_id, _annee_id, _rec.classe_origine_id, _rec.decision, _rec.classe_destination_id)
    ON CONFLICT (ecole_id, eleve_id, annee_id) DO UPDATE
      SET decision = EXCLUDED.decision,
          classe_destination_id = EXCLUDED.classe_destination_id,
          updated_at = now();
    _count_parcours := _count_parcours + 1;

    IF _rec.decision IN ('passage', 'transfert') AND _rec.classe_destination_id IS NOT NULL THEN
      UPDATE eleves SET classe_id = _rec.classe_destination_id, updated_at = now()
      WHERE id = _rec.eleve_id AND ecole_id = _ecole_id;
      _count_applied := _count_applied + 1;
    ELSIF _rec.decision = 'redoublement' THEN
      UPDATE eleves SET updated_at = now()
      WHERE id = _rec.eleve_id AND ecole_id = _ecole_id;
      _count_applied := _count_applied + 1;
    ELSIF _rec.decision = 'exclusion' THEN
      UPDATE eleves SET statut = 'exclu', updated_at = now()
      WHERE id = _rec.eleve_id AND ecole_id = _ecole_id;
      _count_applied := _count_applied + 1;
    END IF;

    INSERT INTO audit_decisions_fin_annee (ecole_id, decision_id, action, ancien_statut, nouveau_statut, effectue_par, details)
    VALUES (_ecole_id, _rec.id, 'application', 'verrouille', 'applique', _uid,
      jsonb_build_object('decision', _rec.decision, 'eleve_id', _rec.eleve_id, 'classe_destination_id', _rec.classe_destination_id));
  END LOOP;

  UPDATE decisions_fin_annee SET statut = 'applique', updated_at = now()
  WHERE ecole_id = _ecole_id AND annee_id = _annee_id AND statut = 'verrouille';

  RETURN jsonb_build_object('parcours', _count_parcours, 'affectations', _count_applied);
END;
$$;

REVOKE ALL ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid) TO authenticated;

-- generer_tranches_eleve: add membership guard
CREATE OR REPLACE FUNCTION public.generer_tranches_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ecole uuid;
  v_annee uuid;
  v_cycle uuid;
  v_frais RECORD;
  v_montant_tranche numeric;
  v_labels text[] := ARRAY['1ere tranche','2eme tranche','3eme tranche'];
  v_dates date[];
  i int;
  v_uid uuid := auth.uid();
BEGIN
  SELECT e.ecole_id, e.annee_id, c.cycle_id
    INTO v_ecole, v_annee, v_cycle
  FROM eleves e
  LEFT JOIN classes c ON c.id = e.classe_id
  WHERE e.id = _eleve_id;

  IF v_ecole IS NULL OR v_annee IS NULL OR v_cycle IS NULL THEN RETURN; END IF;

  IF v_uid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_uid AND ur.ecole_id = v_ecole
    ) THEN
      RAISE EXCEPTION 'Acces refuse';
    END IF;
  END IF;

  SELECT * INTO v_frais
  FROM frais_scolarite
  WHERE ecole_id = v_ecole AND annee_id = v_annee AND cycle_id = v_cycle
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM tranches WHERE eleve_id = _eleve_id AND frais_id = v_frais.id) THEN
    RETURN;
  END IF;

  SELECT ARRAY[
    make_date(EXTRACT(YEAR FROM debut)::int, 10, 15),
    make_date(EXTRACT(YEAR FROM fin)::int, 1, 15),
    make_date(EXTRACT(YEAR FROM fin)::int, 4, 15)
  ] INTO v_dates
  FROM annees_scolaires WHERE id = v_annee;

  v_montant_tranche := ROUND(v_frais.montant_annuel / GREATEST(v_frais.nb_tranches,1));

  FOR i IN 1..LEAST(v_frais.nb_tranches, 3) LOOP
    INSERT INTO tranches (ecole_id, eleve_id, frais_id, numero, label, echeance, montant, paye, statut)
    VALUES (
      v_ecole, _eleve_id, v_frais.id, i, v_labels[i], v_dates[i],
      CASE WHEN i = v_frais.nb_tranches THEN v_frais.montant_annuel - v_montant_tranche*(i-1) ELSE v_montant_tranche END,
      0,
      CASE WHEN v_dates[i] < CURRENT_DATE THEN 'retard'::tranche_statut ELSE 'due'::tranche_statut END
    );
  END LOOP;
END;
$$;

-- Restrict SELECT policies to authenticated only
DROP POLICY IF EXISTS bulletins_paie_select ON public.bulletins_paie;
CREATE POLICY bulletins_paie_select ON public.bulletins_paie
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

DROP POLICY IF EXISTS finance_settings_select ON public.finance_settings;
CREATE POLICY finance_settings_select ON public.finance_settings
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

DROP POLICY IF EXISTS finance_settings_write ON public.finance_settings;
CREATE POLICY finance_settings_write ON public.finance_settings
  FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'));

DROP POLICY IF EXISTS notifications_parents_select ON public.notifications_parents;
CREATE POLICY notifications_parents_select ON public.notifications_parents
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'));

DROP POLICY IF EXISTS parametres_notifications_select ON public.parametres_notifications;
CREATE POLICY parametres_notifications_select ON public.parametres_notifications
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

DROP POLICY IF EXISTS sms_config_select ON public.sms_config;
CREATE POLICY sms_config_select ON public.sms_config
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'));

DROP POLICY IF EXISTS sms_logs_select ON public.sms_logs;
CREATE POLICY sms_logs_select ON public.sms_logs
  FOR SELECT TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin')
      OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'));
