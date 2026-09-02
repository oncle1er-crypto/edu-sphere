-- La secrétaire voit déjà les contrats et dispose de l'écran de gestion RH,
-- mais les politiques d'écriture étaient limitées à admin/directeur. On aligne
-- l'autorisation d'écriture sur l'interface, tout en conservant l'isolation par
-- école et les opérations sensibles (suppression/résiliation) plus restreintes.

DROP POLICY IF EXISTS contrats_insert_admin_directeur
  ON public.contrats_enseignants;

CREATE POLICY contrats_insert_rh_staff
  ON public.contrats_enseignants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      private.has_ecole_role((SELECT auth.uid()), ecole_id, 'admin'::app_role)
      OR private.has_ecole_role((SELECT auth.uid()), ecole_id, 'directeur'::app_role)
      OR private.has_ecole_role((SELECT auth.uid()), ecole_id, 'secretaire'::app_role)
    )
    AND EXISTS (
      SELECT 1
      FROM public.enseignants personnel
      WHERE personnel.id = enseignant_id
        AND personnel.ecole_id = contrats_enseignants.ecole_id
    )
  );

DROP POLICY IF EXISTS contrats_update_admin_directeur
  ON public.contrats_enseignants;

CREATE POLICY contrats_update_rh_staff
  ON public.contrats_enseignants
  FOR UPDATE
  TO authenticated
  USING (
    private.has_ecole_role((SELECT auth.uid()), ecole_id, 'admin'::app_role)
    OR private.has_ecole_role((SELECT auth.uid()), ecole_id, 'directeur'::app_role)
    OR private.has_ecole_role((SELECT auth.uid()), ecole_id, 'secretaire'::app_role)
  )
  WITH CHECK (
    (
      private.has_ecole_role((SELECT auth.uid()), ecole_id, 'admin'::app_role)
      OR private.has_ecole_role((SELECT auth.uid()), ecole_id, 'directeur'::app_role)
      OR private.has_ecole_role((SELECT auth.uid()), ecole_id, 'secretaire'::app_role)
    )
    AND EXISTS (
      SELECT 1
      FROM public.enseignants personnel
      WHERE personnel.id = enseignant_id
        AND personnel.ecole_id = contrats_enseignants.ecole_id
    )
  );
