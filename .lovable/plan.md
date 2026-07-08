
## Comment appliquer la scolarité à une classe — état actuel

Aujourd'hui, la scolarité n'est **pas** appliquée classe par classe, mais **par niveau/cycle** via une grille tarifaire. Voici la marche à suivre dans l'app actuelle :

1. **Finances → Configuration → Grille tarifaire (scolarité)**
   - Créer une ligne par niveau (ex. CP1, CP2, 6ᵉ, 5ᵉ…) avec : frais d'inscription, montant total, et le découpage en tranches (T1/T2/T3 + échéances).
2. **Générer les tranches** pour les élèves :
   - Élève par élève : à l'inscription, le bouton « 1er paiement » appelle `generer_tranches_eleve` automatiquement.
   - En masse : le bouton « Régénérer les tranches des pré-inscrits » (hook `useGrilleTarifs`) applique la grille à tous les pré-inscrits du niveau.
3. Les tranches apparaissent alors dans **Finances → Recouvrement / Encaissements** pour chaque élève de la classe.

➡️ Il n'existe donc **pas encore de bouton « Appliquer à cette classe »** : la grille se définit par niveau, pas par classe.

## Ajout proposé : bouton « Appliquer la scolarité » par classe

Pour rendre l'opération plus intuitive côté **Classes**, ajout d'un bouton unique qui :

- Vérifie qu'une ligne de grille existe pour le **niveau/cycle de la classe**.
- Appelle `generer_tranches_eleve` (RPC existante) pour **chaque élève actif de la classe** (statuts `inscrit` + `pre_inscrit`).
- Affiche un résumé : X élèves traités, Y déjà à jour, Z erreurs (ex. grille manquante).

### Emplacement UI
- Page **Classes → Effectifs** (`src/pages/classes/sections/ClassesEffectifs.tsx`) : bouton dans l'entête de chaque classe « Appliquer la scolarité ».
- Ouvre une petite `Dialog` de confirmation listant : niveau détecté, nombre d'élèves concernés, montant total de la grille.

### Détails techniques
- Nouveau composant `ApplyScolariteButton.tsx` sous `src/pages/classes/components/`.
- Requêtes :
  - `SELECT id FROM eleves WHERE classe_id = ? AND statut IN (...STATUTS_ACTIFS)`.
  - Boucle `supabase.rpc('generer_tranches_eleve', { _eleve_id })` avec `Promise.allSettled` pour ne pas s'arrêter à la 1ʳᵉ erreur.
- Aucune migration SQL, aucun changement de schéma — on réutilise les RPC existantes.
- Toast final : « Scolarité appliquée à 42 élèves (2 ignorés : grille manquante) ».

### Fichiers touchés
- **Nouveau** : `src/pages/classes/components/ApplyScolariteButton.tsx` (~120 lignes).
- **Modifié** : `src/pages/classes/sections/ClassesEffectifs.tsx` — intégration du bouton par ligne de classe.

Rien d'autre n'est modifié : la grille tarifaire, les RPC, et le workflow d'inscription individuel restent identiques.
