# Repérer les élèves ayant au moins un document

Ajouter, dans la liste des élèves (`/eleves/liste`), un indicateur du **nombre de documents** attachés à chaque dossier, plus un **filtre** dédié.

## 1. Récupérer les compteurs de documents

Nouveau petit hook `useDocumentsCountByEleve(ecoleId)` :

- Une seule requête au chargement : `SELECT eleve_id FROM documents_eleves WHERE ecole_id = ?`
- Retourne un `Map<eleveId, number>` (agrégation côté client, très peu coûteux même à 200 élèves).
- Exposé : `{ countByEleve, loading, refetch }`.
- Rafraîchi manuellement après ajout/suppression d'un document depuis le drawer (via `refetch()` passé au drawer, ou plus simple : refetch à la fermeture du drawer).

Aucune modification de schéma nécessaire.

## 2. Nouveau filtre « Documents »

Dans la barre de filtres de `StudentsList.tsx`, à côté de « Tous statuts », ajouter un `Select` :

- **Tous les dossiers** (défaut)
- **Avec au moins un document**
- **Sans aucun document**

État `docFilter: "all" | "with" | "without"`, appliqué dans le `filtered = useMemo(...)`. Reset de la pagination inclus.

## 3. Indicateur visuel

### Vue liste (tableau)

- Nouvelle colonne **Docs** (juste après « Classe », largeur étroite, masquée sur mobile via `hidden md:table-cell`).
- Contenu par ligne :
  - Si `count > 0` : petit badge vert pâle avec icône trombone (`Paperclip` lucide) + chiffre, ex. `📎 3`. Tooltip : « 3 document(s) dans le dossier ».
  - Si `count === 0` : icône trombone grise atténuée + `—`. Tooltip : « Aucun document ».

### Vue grille (cartes)

- Ajouter un petit **badge trombone** en overlay en haut à gauche de chaque carte (`absolute top-1.5 left-1.5`) : rond, fond vert pâle, icône `Paperclip` + chiffre. N'apparaît que si `count > 0` (garde la carte propre pour les dossiers vides).

Couleurs via tokens sémantiques (`bg-emerald-100 text-emerald-700` acceptable ici, aligné avec le reste de la page Documents qui utilise déjà ces teintes de succès).

## 4. Compteur global (bonus léger)

Dans le titre de la section, à côté de « Liste des élèves (196) », afficher un sous-texte : « X avec documents, Y sans ». Aide à repérer l'ampleur des dossiers incomplets.

## Détails techniques

- Fichiers modifiés :
  - `src/hooks/useDocumentsCountByEleve.ts` (nouveau)
  - `src/pages/eleves/sections/StudentsList.tsx` (colonne, filtre, badge overlay, sous-titre)
- Aucune migration SQL, aucune policy RLS touchée (la table `documents_eleves` est déjà lisible par les rôles autorisés de l'école).
- Le fetch des counts se déclenche en parallèle de `useEleves`, pas de chargement bloquant : la liste s'affiche même si les counts arrivent avec un léger décalage (badges vides pendant ~200 ms max).
