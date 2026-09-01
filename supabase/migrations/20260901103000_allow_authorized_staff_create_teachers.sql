-- Aligne l'insertion des enseignants sur les permissions effectives de l'interface.
-- Une secrétaire n'obtient cet accès que si "Enseignants > Créer" lui a été accordé.
CREATE POLICY enseignants_insert_with_create_permission
ON public.enseignants
FOR INSERT
TO authenticated
WITH CHECK (
  private.has_effective_permission(
    (SELECT auth.uid()),
    ecole_id,
    'enseignants',
    'create'
  )
);
