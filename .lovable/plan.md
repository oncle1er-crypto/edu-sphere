## Diagnostic

Le combo « Trimestre » est vide parce que l'année scolaire **active** dans la base est **2026‑2027**, mais **aucun trimestre n'a encore été créé** pour cette année.

Les 3 trimestres existants (Trimestre 1/2/3) appartiennent à l'année **2025‑2026**, qui est **verrouillée** et donc pas sélectionnée par défaut. La page Bulletins ne charge que les périodes de l'année active → liste vide → combo qui n'affiche rien à l'ouverture.

Ce n'est pas un bug de rendu du Select : c'est un état de données. Il faut le rendre visible à l'utilisateur et lui proposer une action.

## Plan

### 1. Améliorer le combo Trimestre (Bulletins.tsx)

- Si `periodes.length === 0` après chargement : afficher dans le `SelectContent` un item désactivé « Aucun trimestre créé pour cette année ».
- Sous le Select, afficher une petite ligne d'aide (texte muted) quand la liste est vide :
  « L'année active *2026‑2027* n'a pas encore de trimestres. »
- Ajouter à droite un bouton « Créer les trimestres » qui redirige vers `/parametres` (section Périodes académiques) où la génération existe déjà.

### 2. Alerte informative en haut de la page

Quand `periodes.length === 0`, remplacer le message actuel « Sélectionnez un trimestre et une classe. » par une `Alert` claire expliquant que l'année active n'a pas de découpage et pointant vers la création dans Paramètres → Année scolaire.

### 3. Aucune modification backend / contexte

On ne change pas la logique de sélection de l'année active ni la structure des périodes. Il s'agit uniquement d'UX sur la page Bulletins.

## Détails techniques

- Fichier modifié : `src/pages/examens/sections/Bulletins.tsx`
- Rendu conditionnel basé sur `periodes.length` (déjà chargé par l'effet existant).
- Utiliser `useNavigate` de react-router pour le bouton « Créer les trimestres » → route existante des paramètres.
- Aucun nouveau composant, aucune requête supplémentaire.
