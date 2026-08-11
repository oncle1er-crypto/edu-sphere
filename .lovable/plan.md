# Dépenses enregistrées mais invisibles

## Cause confirmée

Les 9 dépenses existent bien en base (13 juillet → 4 août 2026). La page ne montre que les dépenses comprises dans l'année scolaire active (14 septembre 2026 → 30 juin 2027) : toutes sont donc filtrées, d'où « Dépenses (0) ».

## Correction retenue

Sélecteur de période sur la page Dépenses, avec « Toutes les dépenses » par défaut afin que rien ne disparaisse silencieusement :

1. Sélecteur : **Toutes les dépenses** (défaut), **Année scolaire active**, **Mois en cours**. Le compteur, la répartition par catégorie et le total suivent la période choisie.
2. État vide plus clair : si la période sélectionnée est vide alors que des dépenses existent ailleurs, message dédié + bouton « Voir toutes les dépenses ».
3. Avertissement discret sous le champ Date du formulaire lorsque la date est hors de l'année scolaire active. L'enregistrement reste autorisé.

Aucune donnée n'est modifiée et l'année scolaire n'est pas touchée.

## Détails techniques

- `src/pages/finances/sections/Expenses.tsx` : état local `periode`, `range` passé à `useDepenses` (`undefined` = tout), état vide enrichi, avertissement de date.
- `src/hooks/useDepenses.ts` : exposer un total non borné par la date pour alimenter le message d'état vide. Aucun changement de logique d'écriture.
- Aucune migration SQL.
