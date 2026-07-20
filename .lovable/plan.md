# Permissions par rôle — masquer modules, fonctions et options

## Constat
L'infra existe déjà côté "utilisateur individuel" : tables `app_modules` + `user_permissions`, hook `usePermissions().can(module, action)` et composant `<Can module="..." action="...">`. Ce qui manque :

1. **Aucun paramétrage par rôle** (aujourd'hui il faut ouvrir chaque utilisateur un par un).
2. **La sidebar et les pages ne filtrent pas** encore selon `can(...)` — donc même si on définit des permissions, tout reste visible.
3. Impossible de masquer une **option fine** (ex. bouton « Supprimer paiement », onglet « Comptabilité ») sans passer par du code.

## Ce qui va être construit

### 1. Permissions par rôle (backend)
Nouvelle table `role_permissions(ecole_id, role, module_key, can_view/create/update/delete/export)` + RPC :
- `get_effective_permissions(user_id, ecole_id)` : union `role_permissions` (rôles de l'user) ∪ overrides `user_permissions`.
- `set_role_permissions(ecole_id, role, permissions[])` (admin/directeur seulement).
- Seed initial basé sur `ROLE_DEFAULT_MODULES` déjà présent dans `UsersRoles.tsx` (secrétaire = eleves, classes, vie_scolaire en lecture ; comptable = finances plein accès ; etc.).

`usePermissions` sera modifié pour lire l'effectif via la RPC (rôle + override).

### 2. Nouvelle page « Rôles & Permissions »
Sous **Paramètres → Utilisateurs & Rôles**, ajout d'un onglet **« Permissions par rôle »** :
- Sélecteur de rôle (admin, directeur, secrétaire, comptable, enseignant, éducateur, surveillant, parent).
- Matrice modules × actions (View / Create / Update / Delete / Export), identique à `PermissionsMatrixDialog`.
- Presets : Plein accès / Lecture seule / Aucun.
- Bouton « Réinitialiser aux valeurs par défaut ».
Le dialog par-utilisateur existant est conservé pour les exceptions individuelles.

### 3. Application dans l'UI
- **Sidebar** (`AppSidebar.tsx`) : chaque item devient conditionnel via `can(module, "view")`. Les sections vides sont masquées.
- **Router** (`App.tsx`) : garde `<RequirePerm module="..." />` qui redirige vers `/` si l'utilisateur n'a pas l'accès (empêche l'accès par URL directe).
- **Actions sensibles** : les boutons « Supprimer », « Exporter », « Créer » clés (finances, élèves, notes, etc.) sont wrappés dans `<Can action="delete">…</Can>`. Périmètre du 1ᵉʳ lot : Finances, Élèves, Classes, Notes/Examens, Vie scolaire. Les autres modules pourront être durcis dans un lot suivant.

### 4. Options fines / sous-modules
Ajout dans `app_modules` d'entrées sous-modules (ex. `finances.comptabilite`, `finances.relances`, `eleves.suppression`, `parametres.zone_dangereuse`). Ces clés sont utilisables via `<Can module="finances.comptabilite">` pour masquer un onglet ou un bouton précis. Périmètre initial : ~10 sous-clés là où c'est vraiment nécessaire.

## Détails techniques
- Nouvelle migration SQL : table `role_permissions`, RPC, GRANTs (`authenticated` SELECT sur `role_permissions`, RPC en SECURITY DEFINER).
- `usePermissions.load()` remplace le 2ᵉ SELECT par `supabase.rpc("get_effective_permissions", …)`.
- Nouveau composant `<RequirePerm>` (route guard).
- Sidebar : filtrage `items.filter(i => can(i.moduleKey, "view"))`, section masquée si vide.
- Rôle **admin** reste bypass complet (déjà en place dans `can()`).

## Hors périmètre de ce lot
- Migration exhaustive de toutes les pages : on couvre sidebar + routes + actions sensibles des 5 modules critiques ; les autres suivront à la demande.
- Permissions par classe/cycle (déjà géré ailleurs).

Souhaite-tu que je démarre l'implémentation avec ce périmètre, ou tu préfères une portée différente (ex. uniquement sidebar + rôles sans les sous-modules d'abord) ?
