
## Objectif

Après la création d'un utilisateur, afficher une boîte de dialogue persistante avec **l'identifiant** (email ou téléphone) et un **mot de passe temporaire à 6 chiffres**, avec boutons **Copier** (chaque champ + tout en bloc) et **Envoyer** (SMS/WhatsApp/Email selon l'identifiant). L'utilisateur devra changer ce mot de passe à la 1ère connexion (flux `must_change_password` déjà en place).

## Changements

### 1. Edge function `supabase/functions/admin-manage-users/index.ts`
- Sur `action: "create"` : si `password` non fourni, générer un code à **6 chiffres** (`100000–999999`) au lieu du mot de passe aléatoire long actuel.
- Toujours forcer `must_change_password = true` quand le mot de passe est généré côté serveur.
- Réponse: `{ user_id, temp_password, login_identifier, channel: "email" | "phone" }` (channel dérivé du domaine `phone.gsp.local`).

### 2. `src/hooks/useUsersRoles.ts`
- `createUser` renvoie l'objet `{ temp_password, login_identifier, channel }` au lieu d'un simple booléen, pour que l'appelant puisse ouvrir le dialog.
- Retirer le toast 15 s « mot de passe temporaire : … » (remplacé par le dialog).

### 3. Nouveau composant `src/pages/parametres/sections/CredentialsPreviewDialog.tsx`
- Props: `open`, `onOpenChange`, `fullName`, `identifier`, `password`, `channel`.
- Affiche :
  - Nom complet.
  - Identifiant (email/téléphone) + bouton **Copier**.
  - Mot de passe à 6 chiffres en gros, monospace + bouton **Copier**.
  - Bouton **Copier tout** (bloc formaté prêt à coller).
  - Bouton **Envoyer par SMS/WhatsApp** (si `channel === "phone"`, `tel:` / `https://wa.me/…?text=`) ou **Envoyer par email** (`mailto:?subject=&body=`).
  - Avertissement : « ce mot de passe ne sera plus affiché après fermeture ».
- Fermeture uniquement par bouton explicite (pas de clic extérieur) pour éviter perte accidentelle.

### 4. `src/pages/parametres/sections/UsersRoles.tsx`
- Après un `createUser` réussi renvoyant un `temp_password`, stocker le résultat dans un state local et ouvrir `CredentialsPreviewDialog`.

## Hors périmètre
- Envoi SMS/WhatsApp automatisé côté serveur (on utilise les liens `sms:`/`wa.me`/`mailto:` du device).
- Réémission d'identifiants pour comptes existants (déjà couvert par `resetPassword`).
- Modification du flux d'invitation par magic link (débat précédent non tranché).
