DROP POLICY IF EXISTS ecole_write ON public.documents_eleves;
CREATE POLICY ecole_write ON public.documents_eleves
FOR ALL
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
);

DROP POLICY IF EXISTS ecole_write ON public.exigences_documents_eleves;
CREATE POLICY ecole_write ON public.exigences_documents_eleves
FOR ALL
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
);