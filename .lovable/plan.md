# Retirer la ligne « TOTAL (27) » du bilan comptable

## Constat

Cette ligne n'est pas un total du bilan : c'est la ligne de pied automatique que l'exportateur de rapports (`src/lib/reports/exporters.ts`, fonction `buildFootRow`) ajoute à **tous** les rapports. Elle additionne aveuglément toutes les valeurs numériques de chaque colonne, y compris :

- les lignes de détail des entrées,
- la ligne TOTAL ENTRÉES,
- les sorties et TOTAL SORTIES,
- le SOLDE DE CAISSE, le SOLDE CUMULÉ,
- les lignes du bloc « Bilan de la période », des modes de paiement et des remises.

Résultat : un montant qui compte plusieurs fois les mêmes encaissements (les 59 568 000 F affichés). Elle est donc non seulement inutile, mais trompeuse sur ce document. Le vrai total du document est déjà mis en valeur par l'encadré « SOLDE DE CAISSE (CLÔTURE) » et par le bloc « Bilan de la période ».

## Correction proposée

1. Ajouter une option `hideFootTotal?: boolean` au type `ExportPayload` dans `src/lib/reports/exporters.ts`, prise en compte aux trois endroits qui appellent `buildFootRow` (PDF paginé par groupe, PDF standard, Excel/CSV) : quand elle vaut `true`, aucune ligne de pied automatique n'est générée.
2. Activer cette option dans le payload d'export du bilan comptable (`src/pages/finances/sections/BalanceSheet.tsx`) — CSV, Excel et PDF.
3. Aucun autre rapport n'est modifié : la ligne de totaux automatique reste en place partout où elle a du sens (listes d'élèves, points de caisse, encaissements, etc.).

## Détails techniques

- Modification limitée à deux fichiers : `src/lib/reports/exporters.ts` (option + 3 conditions) et `src/pages/finances/sections/BalanceSheet.tsx` (ajout de `hideFootTotal: true`).
- Pas de changement de la logique de calcul du bilan (`src/hooks/useBilanComptable.ts`), ni de base de données.
