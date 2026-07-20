## Diagnostic (à confirmer par la 1re étape du plan)

Les logs d'auth Supabase montrent, dans les ~10 s qui suivent la saisie du mot de passe de `secretaire@laprovidence.ci`, **plus de 40 événements `Login` (login_method=token) et `token_revoked`** entrelacés, provenant en parallèle des deux origines `gs-laprovidence.lovable.app` (IP mobile) et `…lovableproject.com` (IP fixe), suivis d'un `429: Request rate limit reached` sur `/token`.

Cascade probable :
1. Le compte a **deux onglets/sessions actifs** sur la même identité (prod + preview), et/ou le client GoTrue est instancié deux fois (`@supabase/supabase-js` dans `src/integrations/supabase/client.ts` **et** `createLovableAuth()` dans `src/integrations/lovable/index.ts`). Chacun a son propre `autoRefreshToken` mais partage le même refresh token en `localStorage`.
2. Rotation single-use : dès qu'un client refresh, l'autre voit son refresh token révoqué → il retente → `token_revoked` → nouveau login token → boucle.
3. Le pic déclenche le **rate-limit 429** puis un mécanisme serveur qui écrit un événement `suspicious_login_blocked` / `mfa_account_locked` (ou severity `critical`) dans `security_audit_logs`.
4. Le listener Realtime dans `src/context/AuthContext.tsx` (`SUSPICIOUS_EVENTS`) reçoit cet INSERT et appelle `supabase.auth.signOut()` → toast **« Activité suspecte détectée. Vous avez été déconnecté. »**

Autre facteur aggravant : la Realtime `on(INSERT)` filtre uniquement par `user_id`. Si le trigger d'audit journalise en cascade côté RPC/SECURITY DEFINER, tout événement `warning`/`info` mal classé `critical` déclenche aussi la déconnexion.

## Correctifs proposés

### 1. Vérifier l'événement déclencheur (obligatoire avant fix)
Interroger `security_audit_logs` pour le user `86782b46-…` et `14030ae7-…` entre 08:52:55 et 08:54:30 UTC. Confirmer quel `event_type`/`event_severity` déclenche le signOut. Ajuster le reste du plan selon la vraie cause (suspicious_login_blocked, mfa_account_locked, ou un event non-anticipé signalé `critical`).

### 2. Rendre le listener « activité suspecte » beaucoup plus strict (`src/context/AuthContext.tsx`)
- Ne signOut que si `event_severity === "critical"` **ET** `event_type ∈ SUSPICIOUS_EVENTS`, plus jamais sur severity seule.
- Ignorer explicitement les events déclenchés par la propre session courante (comparer `metadata.session_id` / `metadata.origin` si présent) pour éviter l'auto-déconnexion.
- Ajouter un délai de garde de 5 s après `SIGNED_IN` pendant lequel on ignore les events (évite qu'un event de la connexion précédente déconnecte immédiatement).

### 3. Supprimer la double instance GoTrue
- Faire en sorte que `createLovableAuth()` n'instancie pas un second client d'auth persistant, ou l'isoler avec `persistSession:false, autoRefreshToken:false, storageKey:"lovable-oauth"` distinct.
- Vérifier qu'il n'y a qu'un seul `createClient(...)` avec `persistSession:true` dans tout le bundle (`rg createClient src`).

### 4. Réduire la casse en cas de refresh concurrent
- Dans `src/context/AuthContext.tsx`, ignorer aussi l'event `USER_UPDATED` sur `setSession` s'il ne change pas d'utilisateur (déjà fait pour TOKEN_REFRESHED — étendre).
- Ne pas relancer `refresh(true)` du hook `useMfa` sur `SIGNED_IN` si le user est identique (évite un second `getAuthenticatorAssuranceLevel()` qui peut re-déclencher refresh).

### 5. Ajouter un garde côté serveur (optionnel, si l'event fautif est `suspicious_login_blocked` trigger-généré)
- Assouplir le seuil du trigger côté DB (>N logins/minute) pour ne pas confondre rotation légitime et attaque.
- OU cesser d'écrire cet event en `critical` quand `login_method='token'` (refresh), ne le garder critique que pour `login_method='password'` répétés.

### 6. Nettoyage de session bloquée pour l'utilisateur affecté
- Une fois le fix déployé, forcer la déconnexion de toutes les sessions actives via `auth.admin.signOut(user_id, {scope:'global'})` pour repartir sur un état propre.

## Détails techniques

Fichiers touchés (attendus) :
- `src/context/AuthContext.tsx` — filtres SUSPICIOUS + delay guard.
- `src/integrations/lovable/index.ts` — vérifier / isoler le second client.
- `src/hooks/useMfa.ts` — ne pas re-fetch AAL si user inchangé.
- Nouvelle migration SQL (si étape 5 confirmée).

Vérification :
- Reproduire le login en prod avec `secretaire@laprovidence.ci` puis observer :
  - un seul `Login` password + 1 `Login` token de rotation (pas 40),
  - aucun 429 sur `/token`,
  - pas d'INSERT `suspicious_login_blocked` dans `security_audit_logs`,
  - session stable > 60 s sans toast rouge.
