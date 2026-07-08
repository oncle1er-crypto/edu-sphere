## Diagnostic

Ce n'est pas un bug de données — c'est une **race condition** classique entre l'authentification et le chargement des hooks.

**Ce qui se passe aujourd'hui :**
1. Vous vous connectez → l'app démarre
2. `useEcoleId` regarde `user` : au premier rendu, `user` est encore `null` (la session n'est pas encore restaurée depuis le stockage)
3. Le hook conclut immédiatement « pas d'utilisateur » et met `loading = false` avec `ecoleId = null`
4. Les hooks qui en dépendent (`useEleves`, KPIs du dashboard, etc.) reçoivent `ecoleId = null` → aucune requête déclenchée
5. La session finit par se restaurer un instant plus tard, mais rien ne re-déclenche le fetch automatiquement dans certains composants
6. Vous rafraîchissez → cette fois la session est déjà en cache → tout s'affiche

**Preuve dans le code :** `useEcoleId` (src/hooks/useEcoleId.ts) ne différencie pas « pas d'utilisateur » de « auth en cours de chargement ».

## Correctif

### 1. `useEcoleId` : attendre que l'auth soit prête
Ne plus déclarer `loading = false` tant que `AuthContext.loading` est encore `true`. Rester en attente pendant l'hydratation de la session au lieu de renvoyer prématurément `ecoleId = null`.

### 2. Hooks de données : lier `enabled` à l'état d'auth
Pour chaque hook consommateur (`useEleves`, `useClasses`, `useEnseignants`, `useMatieres`, KPIs du dashboard Élèves, etc.), s'assurer que le `useEffect` de fetch attend :
- `!authLoading`
- `!ecoleLoading`
- `ecoleId` défini

Aujourd'hui la condition existe mais est court-circuitée par le `loading=false` prématuré de `useEcoleId`.

### 3. Section « Vue d'ensemble » du module Élèves
Vérifier le hook qui alimente les 6 KPIs (Total, Inscrits actifs, Classes, Présence, Nouveaux, Retard) pour qu'il applique la même garde et re-fetch quand `ecoleId` bascule de `null` à une valeur.

### 4. Périmètre étendu (même cause racine)
Auditer d'un coup tous les hooks qui suivent le même pattern « `if (!ecoleId) return;` dans `useEffect` » pour appliquer la correction uniformément (Finances, Bibliothèque, Cantine, Transport, Vie scolaire, Cours de vacances, etc.).

## Détails techniques

- Fichier pivot : `src/hooks/useEcoleId.ts` — ajouter la dépendance à `useAuth().loading` et ne quitter l'état de chargement qu'une fois l'auth stabilisée.
- Pattern cible pour tous les hooks de données :
  ```
  useEffect(() => {
    if (authLoading || ecoleLoading) return;   // attendre
    if (!ecoleId) { setLoading(false); return; } // vraiment déconnecté
    fetch();
  }, [authLoading, ecoleLoading, ecoleId, ...]);
  ```
- Aucune modification de schéma DB, aucune politique RLS à toucher.
- Aucun impact fonctionnel autre que « les données apparaissent dès la connexion ».

## Résultat attendu

Après login, les 227 élèves, les 17 classes et tous les KPIs s'affichent sans avoir besoin de rafraîchir la page.
