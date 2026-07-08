## Diagnostic

Deux causes se combinent pour donner l'impression que « la page se rafraîchit et le formulaire disparaît » :

### 1. Re-rendus parasites du contexte d'authentification
Dans `src/context/AuthContext.tsx`, `onAuthStateChange` appelle `setSession(session)` à **chaque** événement, y compris `TOKEN_REFRESHED`. Or Supabase rafraîchit automatiquement le token dès que l'onglet reprend le focus. Résultat : à chaque retour sur l'onglet, la référence `session` change → tout le sous-arbre (AuthProvider → EcoleProvider → AcademicPeriodProvider → Routes) se re-rend, ce qui déclenche :
- un flash du splash « Vérification de votre session… » / « Vérification de sécurité… » (visible dans la session replay),
- un `purgeSensitiveCaches()` inutile,
- un `useMfa.refresh()` silencieux mais qui rappelle deux endpoints Supabase,
- un `refetchOnWindowFocus` de TanStack Query (activé par défaut car le `QueryClient` est créé sans config).

### 2. Perte de l'état local des dialogues d'inscription
Les formulaires (ex. `VacancesInscriptions`, `Eleves`, etc.) stockent leur brouillon uniquement dans `useState` local. Dès que l'utilisateur navigue vers un autre onglet du menu, React Router démonte la page → l'état du dialog est perdu. Au retour, tout est vide.

---

## Correctifs proposés

### A. Stabiliser `AuthContext.tsx`
- Ne mettre à jour `session` que si l'`access_token` ou l'`user.id` a réellement changé (comparaison avec la valeur précédente).
- Restreindre `purgeSensitiveCaches()` aux seuls événements `SIGNED_IN` et `SIGNED_OUT` (retirer `TOKEN_REFRESHED`).
- Garantir que `loading` ne passe à `false` qu'une seule fois (initial), plus jamais remis à `true`.

### B. Alléger `useMfa`
- Ignorer `TOKEN_REFRESHED` : le niveau AAL ne change pas sur un refresh silencieux.
- Ne rafraîchir que sur `SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED`, `MFA_CHALLENGE_VERIFIED`.

### C. Désactiver le refetch au focus dans TanStack Query
- Configurer le `QueryClient` (dans `src/App.tsx`) avec :
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: false`
  - `staleTime: 30_000` (30 s) pour éviter les rappels inutiles.

### D. Persister le brouillon des formulaires longs
- Ajouter un petit hook générique `useDraftForm(key, initialValue)` qui synchronise l'état d'un formulaire avec `sessionStorage` (auto-clear à la soumission ou après signOut).
- L'appliquer en priorité au dialog **« Nouvelle inscription » de Cours de vacances** (`VacancesInscriptions.tsx`) : brouillon conservé même après navigation, restauré à la réouverture du dialog.
- Extensible ensuite aux autres formulaires longs (inscription élève, création enseignant, dépenses, etc.) sans refactor lourd.

### E. Vérification
- Après build : ouvrir Cours de vacances → Inscriptions → commencer un enregistrement → naviguer vers un autre onglet → revenir → confirmer via Playwright que :
  1. Aucun splash « Vérification… » n'apparaît,
  2. Le dialog rouvert affiche les valeurs déjà saisies.

---

## Fichiers concernés

**Modifiés :**
- `src/context/AuthContext.tsx` — comparaison session, purge conditionnelle.
- `src/hooks/useMfa.ts` — filtrer les events pertinents.
- `src/App.tsx` — options `QueryClient`.
- `src/pages/cours-vacances/sections/VacancesInscriptions.tsx` — brouillon persistant.

**Créés :**
- `src/hooks/useDraftForm.ts` — hook réutilisable (sessionStorage, clear à la soumission / au sign-out).

**Aucune migration SQL.**
