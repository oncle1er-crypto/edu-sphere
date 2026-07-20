# Afficher les permissions par défaut d'un rôle dans le dialog

## Constat
Quand l'admin ouvre **Paramètres → Utilisateurs → Permissions par rôle** et choisit « secrétaire » (ou un autre rôle non encore configuré), la matrice s'affiche **entièrement vide**. L'admin doit tout deviner et cocher à la main, alors que le code contient déjà un dictionnaire `ROLE_DEFAULT_MODULES` définissant l'accès attendu par rôle (secrétaire → élèves, classes, vie scolaire, etc.).

## Correction
Dans `useRolePermissions.ts`, quand la table `role_permissions` ne renvoie **aucune ligne** pour ce rôle/école, pré-remplir la matrice à partir de `ROLE_DEFAULT_MODULES` :
- Modules du rôle : `can_view = true`, `can_export = true`, `can_create/update/delete = false` (lecture + export par défaut, ce qui correspond au preset « Lecture seule »).
- Autres modules : tout à `false`.

Quand il existe **au moins une ligne enregistrée**, on garde le comportement actuel (utiliser strictement ce qui est en base) — l'admin voit ainsi ses choix réels.

## UX dans `RolePermissionsDialog`
- Ajouter en tête du dialog un petit bandeau informatif quand on est en mode « valeurs par défaut non enregistrées » :
  > *Aucune permission enregistrée pour ce rôle. Les cases pré-cochées ci-dessous correspondent aux valeurs par défaut recommandées. Cliquez sur **Enregistrer** pour les valider ou ajustez-les.*
- Le hook expose un flag `isDefault: boolean` pour piloter ce bandeau.

## Détails techniques
- Extraire `ROLE_DEFAULT_MODULES` de `UsersRoles.tsx` vers un fichier partagé `src/lib/roleDefaults.ts` (import propre côté hook).
- Modifier `useRolePermissions.load()` :
  - Après le fetch, si `p` (rows en base) est vide → construire `map` à partir des defaults et positionner `isDefault = true`.
  - Sinon → comportement actuel, `isDefault = false`.
- Rien à changer côté SQL, RPC, RLS, ni côté `usePermissions` (les valeurs par défaut ne s'appliquent visuellement qu'au dialog ; les permissions réelles restent celles enregistrées). Un rôle non enregistré continue de n'avoir aucun accès tant que l'admin n'a pas cliqué « Enregistrer ».

## Hors périmètre
- Pas de seed automatique en base (l'admin garde le contrôle explicite).
- Pas de changement des permissions runtime.
