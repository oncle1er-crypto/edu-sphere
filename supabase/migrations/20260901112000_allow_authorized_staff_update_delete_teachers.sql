-- Aligne la modification et la suppression des enseignants sur les permissions
-- effectives utilisées par l'interface, tout en conservant l'isolation par école.
CREATE POLICY enseignants_update_with_update_permission
ON public.enseignants
FOR UPDATE
TO authenticated
USING (
  private.has_effective_permission((SELECT auth.uid()), ecole_id, 'enseignants', 'update')
)
WITH CHECK (
  private.has_effective_permission((SELECT auth.uid()), ecole_id, 'enseignants', 'update')
);

CREATE POLICY enseignants_delete_with_delete_permission
ON public.enseignants
FOR DELETE
TO authenticated
USING (
  private.has_effective_permission((SELECT auth.uid()), ecole_id, 'enseignants', 'delete')
);
