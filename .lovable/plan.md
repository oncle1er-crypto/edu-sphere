## Objectif

Trois chantiers indépendants dans la même livraison :

1. **Rendre le module « Utilisateurs & rôles » vraiment opérationnel** (voir email/nom, modifier, supprimer, réinitialiser mot de passe, création sans confirmation email).
2. **Nettoyer la page de connexion** (retirer Google + « Créer un compte »).
3. **Rendre 100 % fonctionnelle la nouvelle inscription du module Cours de vacances**.

---

## 1. Module « Utilisateurs & rôles »

### Problèmes constatés
- La liste affiche « Utilisateur » partout et pas d'email → `useUsersRoles` ne récupère jamais `auth.users.email`.
- Pas de bouton **Modifier / Supprimer / Réinitialiser mot de passe** utilisateur.
- La création utilise `supabase.auth.signUp` côté client → exige la confirmation email (« Email not confirmed » au login).
- L'admin ne peut pas voir/agir sur un compte car il n'a pas accès à `auth.users`.

### Correctifs

**a) Nouvelle Edge Function `admin-manage-users`** (service role, vérifie que l'appelant est admin de l'école) avec 4 actions :
- `list` → renvoie `[{ user_id, email, full_name, created_at, email_confirmed_at }]` pour l'école.
- `create` → `admin.createUser({ email, password, email_confirm: true, user_metadata })` puis crée `profiles` (ecole_id, full_name) + `user_roles` pour chaque rôle. **email_confirm: true** = pas besoin de confirmation, connexion immédiate possible.
- `update` → change `full_name` (table `profiles`) et, si fourni, l'email (`admin.updateUserById`).
- `delete` → supprime `user_roles`, `user_permissions`, `profiles` puis `admin.deleteUser`.

Une Edge Function `admin-reset-password` existe déjà : on la réutilise telle quelle (ou on ajoute l'action `reset_password` dans la nouvelle fonction pour tout centraliser — au choix, on ré-utilise l'existante).

**b) Refonte de `src/hooks/useUsersRoles.ts`**
- `fetchUsers` appelle l'edge function `admin-manage-users` (action `list`) au lieu de lire seulement `user_roles` + `profiles`.
- Ajout de `email` et `email_confirmed_at` dans `UserWithRole`.
- Nouvelles méthodes : `createUser`, `updateUser`, `deleteUser`, `resetPassword`.

**c) Refonte de `src/pages/parametres/sections/UsersRoles.tsx`**
- Chaque ligne affiche **nom complet + email** (au lieu de « Utilisateur »).
- Dans la zone dépliée, ajout des boutons :
  - **Modifier** (dialog : nom, email) → `updateUser`.
  - **Réinitialiser mot de passe** (dialog : nouveau mot de passe) → `resetPassword` via edge function existante.
  - **Supprimer l'utilisateur** (confirm + dialog rouge) → `deleteUser`.
- La création (dialog existant) passe désormais par l'edge function → **le compte est immédiatement utilisable pour se connecter, aucun email à confirmer**.

**d) Ajout dans le module `parametres` de la matrice permissions par défaut** du module `cours_vacances` (déjà en base, on l'ajoute dans la constante `MODULES` pour qu'il apparaisse dans la liste des accès — c'est déjà fait dans `app_modules`, il faut juste l'ajouter dans le tableau `MODULES` du fichier `UsersRoles.tsx` avec l'icône Sun).

---

## 2. Page de connexion (`src/pages/auth/LoginPage.tsx`)

- Retirer entièrement le bouton **« Continuer avec Google »** (+ import `Chrome`, fonction `handleGoogleSignIn`, séparateur « ou »).
- Retirer le lien **« Pas encore de compte ? Créer un compte »** en bas de la carte + tout le mode `isSignUp` (state, champ nom complet, texte alternatif du bouton, branche `signUp` dans `handleEmailAuth`).
- Conserver : email/mot de passe, mot de passe oublié, bloc démo, tout le branding.

---

## 3. Cours de vacances — nouvelle inscription

### Diagnostic
Le schéma de `vacances_eleves` est correct (`annee_id` nullable, RLS ouverte aux `admin/directeur/comptable`). Le formulaire fonctionne **si** au moins une classe existe et est active.

### Correctifs (UX + robustesse)
- Dans `VacancesInscriptions.tsx` :
  - Si `classes.length === 0`, afficher un **message explicite** au-dessus du bouton (« Créez d'abord une classe dans l'onglet Classes ») au lieu du simple bouton désactivé silencieux.
  - Rendre la validation plus explicite : si `nom/prenom/classe_id` manquent, afficher un toast d'erreur (au lieu du `return` silencieux ligne 30).
  - `save()` de `useVacances` retourne déjà `null` en cas d'erreur — on capture ça pour **ne pas fermer le dialog** si la sauvegarde échoue et afficher l'erreur.
- Dans `useVacances.ts` :
  - `save()` retourne l'erreur exacte (déjà via `toast.error(error.message)`) — vérifier qu'on renvoie bien `null` sur erreur et l'objet sur succès afin que le composant sache si fermer le dialog.
  - Ajouter un log console explicite en cas d'échec insert pour futur debug.

### Vérification finale
- Après build : reproduire l'inscription via Playwright sur `/cours-vacances` → onglet Inscriptions → créer un élève, screenshot pour valider.

---

## Détails techniques (récap fichiers touchés)

**Créés :**
- `supabase/functions/admin-manage-users/index.ts`
- Migration : ajouter la fonction au `config.toml` (verify_jwt = true).

**Modifiés :**
- `src/hooks/useUsersRoles.ts` — passage par edge function, ajout email + CRUD complet.
- `src/pages/parametres/sections/UsersRoles.tsx` — boutons Modifier / Supprimer / Reset password, affichage email, module `cours_vacances`.
- `src/pages/auth/LoginPage.tsx` — retrait Google + signup.
- `src/pages/cours-vacances/sections/VacancesInscriptions.tsx` — feedback erreurs, message si aucune classe.
- `src/pages/cours-vacances/hooks/useVacances.ts` — retour explicite pour `save`.

**Aucune migration SQL** : le schéma actuel gère déjà tout ce dont on a besoin (RLS admin, `app_modules.cours_vacances`, `email_confirm=true` via service role).
