ALTER FUNCTION public.assign_numero_bon_sortie() SET search_path = public;

ALTER VIEW public.v_encaissements_detail SET (security_invoker = on);

CREATE POLICY "Admins only read database exports" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('database_export_07_08_26','database_export_09_08_26') AND EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins only delete database exports" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('database_export_07_08_26','database_export_09_08_26') AND EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));