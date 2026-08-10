# Dépenses enregistrées mais invisibles

## Ce qui se passe

Les dépenses sont bien enregistrées : la base contient 9 dépenses pour l'école (achat livret reçu 10 000, recharge wifi 30 000, frais de correction test 25 000, etc.), datées entre le **13 juillet et le 4 août 2026**.

La liste des dépenses n'affiche que celles comprises dans l'**année scolaire active**, qui va du **14 septembre 2026 au 30 juin 2027**. Toutes les dépenses saisies sont donc antérieures à l'ouverture de l'année active et sont filtrées hors écran — d'où « Dépenses (0) ».

## Correction proposée

1. **Sélecteur de période** en haut de la page Dépenses :
   - « Année scolaire active » (comportement actuel, par défaut),
   - « Toutes les dépenses » (aucun filtre de date),
   - « Année précédente » et « Mois en cours ».
   Le compteur, la répartition par catégorie et le total suivent la période choisie.

2. **Message explicite quand la liste est vide alors que des dépenses existent** hors période : « Aucune dépense sur la période sélectionnée — des dépenses existent en dehors de cette période », avec un bouton « Voir toutes les dépenses ».

3. **Avertissement à la saisie** : si la date de la dépense est hors de l'année scolaire active, un texte discret sous le champ Date prévient que la dépense n'apparaîtra pas dans la vue « Année active ». L'enregistrement reste autorisé.

4. **Vérification du filtre par niveau** : les dépenses imputées à un cycle ne s'affichent que dans le niveau correspondant. Le libellé de la période indiquera aussi le niveau actif pour éviter la confusion.

## Détails techniques

- `src/pages/finances/sections/Expenses.tsx` : état local `periode`, calcul du `range` passé à `useDepenses` (`undefined` = tout), état vide enrichi, avertissement de date.
- `src/hooks/useDepenses.ts` : ajout d'un compteur « total hors période » (requête count sans borne de date) pour alimenter le message d'état vide. Aucun changement de logique d'écriture.
- Aucune migration SQL, aucune modification de données.
