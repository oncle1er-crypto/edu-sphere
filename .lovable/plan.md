## Objectif

1. **Permissions totalement libres par utilisateur** : matrice modules × actions (voir, créer, modifier, supprimer, exporter) configurable pour chaque utilisateur, indépendamment de son rôle.
2. **Création automatique du compte enseignant** lors de l'enregistrement, avec invitation envoyée par **email + SMS**. L'enseignant définit son mot de passe lors de sa première connexion via un lien sécurisé.

---

## Partie 1 — Permissions personnalisées

### Base de données
- Table `app_modules` (catalogue des modules : `eleves`, `classes`, `enseignants`, `examens`, `finances`, `bibliotheque`, `cantine`, `transport`, `cartes`, `communication`, `presences`, `emploi_temps`, `statistiques`, `parametres`).
- Table `user_permissions` : `(user_id, ecole_id, module_key, can_view, can_create, can_update, can_delete, can_export)` — surcharge totale, ignore le rôle.
- Fonction SQL `has_permission(_user_id, _ecole_id, _module, _action)` (SECURITY DEFINER) — retourne true si la ligne existe avec l'action à true, sinon fallback sur `has_ecole_role(admin)` pour les admins.
- Fonction `set_user_permissions(_target_user, _ecole_id, _permissions jsonb)` — upsert en bulk (admin uniquement, auditée).
- RLS : seuls les admins de l'école peuvent lire/écrire `user_permissions` ; chaque utilisateur peut lire les siennes.

### Frontend
- Hook `usePermissions()` — charge les permissions de l'utilisateur courant + helper `can(module, action)`.
- Hook `useUserPermissions(userId)` — pour l'écran admin.
- Nouveau dialog `PermissionsMatrixDialog.tsx` ouvert depuis `UsersRoles.tsx` (bouton "Permissions" par utilisateur) :
  - Tableau modules × actions avec switches
  - Bouton "Tout cocher / Tout décocher" par ligne et colonne
  - Preset "Lecture seule", "Plein accès"
  - Sauvegarde via RPC
- Guard `<Can module="..." action="..."> ... </Can>` pour masquer boutons/sections dans l'UI.

---

## Partie 2 — Création compte enseignant + invitation

### Base de données
- Ajout colonnes sur `enseignants` : `user_id uuid`, `invitation_sent_at timestamptz`, `invitation_accepted_at timestamptz`.
- Table `teacher_invitations` : `(id, enseignant_id, ecole_id, token_hash, email, telephone, expires_at, consumed_at, created_by)` — token aléatoire 32 octets, expire 7 jours.
- Fonction `consume_teacher_invitation(_token_hash)` — valide + marque consommée, retourne user_id.

### Edge functions
- `create-teacher-account` (admin-only) : reçoit enseignant_id → crée user auth (admin API, sans mot de passe), insère rôle `enseignant`, génère token invitation, déclenche envois email + SMS.
- L'email d'invitation passe par le système Lovable Emails (template dédié "teacher-invitation" à scaffolder).
- Le SMS passe par la fonction `send-sms` existante avec un message court contenant le lien `https://<app>/invitation?token=...`.

### Frontend
- `StaffList.tsx` : ajout d'un toggle "Créer un compte" au formulaire enregistrement enseignant + bouton "Renvoyer l'invitation" sur les enseignants existants.
- Nouvelle page publique `/invitation?token=...` :
  - Valide le token (edge function `accept-teacher-invitation`)
  - Affiche un formulaire "Définir votre mot de passe" (avec confirmation + règles de force)
  - À la soumission : met à jour le mot de passe via `supabase.auth.updateUser`, marque invitation consommée, redirige vers login.

---

## Sécurité
- Audit log (`log_security_event`) sur : changement permissions, création compte enseignant, envoi/consommation invitation.
- RLS strict : `teacher_invitations` lisible uniquement par admins de l'école ; le token brut n'est jamais stocké (hash SHA-256).
- Lien invitation à usage unique, expiration 7 jours, possibilité de renvoyer.

---

## Étapes d'implémentation

1. Migration SQL (modules, permissions, invitations, fonctions, RLS, grants).
2. Hooks frontend (`usePermissions`, `useUserPermissions`) + composant `<Can>`.
3. Dialog matrice de permissions dans `UsersRoles.tsx`.
4. Edge functions `create-teacher-account` + `accept-teacher-invitation`.
5. Page publique `/invitation`.
6. Intégration UI dans `StaffList.tsx` (case "Créer compte" + renvoi invitation).
7. Template email invitation enseignant (si Lovable Emails déjà configuré, sinon SMS uniquement au début).

Confirmez-moi pour démarrer.