
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1) bulletins_paie: SELECT only admin/directeur/comptable
DROP POLICY IF EXISTS ecole_read ON public.bulletins_paie;
CREATE POLICY bulletins_paie_select ON public.bulletins_paie FOR SELECT
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);

-- 2) parametres_notifications: SELECT only admin/directeur
DROP POLICY IF EXISTS ecole_read ON public.parametres_notifications;
CREATE POLICY parametres_notifications_select ON public.parametres_notifications FOR SELECT
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

-- 3) sms_config: SELECT only admin/directeur
DROP POLICY IF EXISTS "Members can view sms_config" ON public.sms_config;
CREATE POLICY sms_config_select ON public.sms_config FOR SELECT
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

-- 4) sms_logs: SELECT only admin/directeur
DROP POLICY IF EXISTS "Members can view sms_logs" ON public.sms_logs;
CREATE POLICY sms_logs_select ON public.sms_logs FOR SELECT
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

-- 5) notifications_parents: SELECT only admin/directeur/surveillant
DROP POLICY IF EXISTS ecole_read ON public.notifications_parents;
CREATE POLICY notifications_parents_select ON public.notifications_parents FOR SELECT
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'surveillant'::app_role)
);

-- 6) finance_settings: restrict to admin/directeur/comptable
DROP POLICY IF EXISTS "Users can view finance settings of their school" ON public.finance_settings;
DROP POLICY IF EXISTS "Users can update finance settings of their school" ON public.finance_settings;
DROP POLICY IF EXISTS "Users can insert finance settings for their school" ON public.finance_settings;

CREATE POLICY finance_settings_select ON public.finance_settings FOR SELECT
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);
CREATE POLICY finance_settings_write ON public.finance_settings FOR ALL
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'comptable'::app_role)
);

-- 7) Storage avatars/eleves: enforce school membership via path
-- New upload path: eleves/{ecole_id}/{eleve_id}-{ts}.jpg
DROP POLICY IF EXISTS "Authenticated upload eleves avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update eleves avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete eleves avatars" ON storage.objects;

CREATE POLICY "Members upload eleves avatars" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'eleves'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Members update eleves avatars" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'eleves'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Members delete eleves avatars" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'eleves'
  AND private.user_belongs_to_ecole(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- 8) Lock down SECURITY DEFINER functions from anonymous role
REVOKE EXECUTE ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.appliquer_decisions_fin_annee(uuid, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enregistrer_paiement(uuid, uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_paiement(uuid, uuid, uuid, numeric, text, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.appliquer_remise(uuid, uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.appliquer_remise(uuid, uuid, uuid, numeric, text, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcilier_tranche_paiements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_promote_on_facture() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_promote_on_document() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_promote_on_classe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_generer_tranches_eleve() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_generer_tranches_frais() FROM PUBLIC, anon, authenticated;
