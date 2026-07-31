# Bilan comptable : données absentes + filtres période/mois

## Pourquoi le tableau est vide (vérifié en base)

- L'année active « 2026 - 2027 » va du **14/09/2026** au **30/06/2027**.
- Les encaissements de cette année existent bien : **161 paiements, 7 270 000 FCFA**, mais ils sont datés du **13 au 31 juillet 2026** (inscriptions/réinscriptions anticipées, avant la rentrée).
- Le bilan filtre les paiements entre le début et la fin de l'année scolaire, et construit une grille de 12 mois qui démarre au mois du début (septembre). Tout ce qui est encaissé avant la rentrée tombe donc hors fenêtre → toutes les lignes affichent « - ».

C'est la seule cause : les données sont présentes, la fenêtre de dates les exclut.

## Correction

1. **Fenêtre d'exercice élargie**
   - La période couverte devient : du 1er du mois deux mois avant la rentrée (donc juillet pour une rentrée en septembre) jusqu'à la fin de l'année scolaire.
   - Tout encaissement ou dépense antérieur à la fenêtre est rattaché au premier mois affiché (aucun montant perdu), tout ce qui est postérieur au dernier mois.
   - La grille de mois est générée dynamiquement à partir de la fenêtre (14 colonnes max au lieu de 12 figées), en conservant l'ordre chronologique juillet → juin.

2. **Filtres de période**
   - Nouvelle barre de filtres au-dessus du tableau :
     - **Vue** : Année complète · Trimestre · Mois
     - Sélecteur de trimestre (T1/T2/T3 selon le découpage de l'année) ou de mois quand la vue correspondante est choisie.
   - Le tableau, les 3 cartes de synthèse (Total entrées / sorties / Solde) et les exports CSV · Excel · PDF ne portent que sur la période sélectionnée, avec la période rappelée dans le sous-titre du document.

3. **Cohérence**
   - Les lignes d'entrées à zéro sur la période restent affichées (structure fixe de la fiche de trésorerie) ; les catégories de dépenses sans mouvement restent masquées.

## Détails techniques

- `src/hooks/useBilanComptable.ts` : remplacer `buildMois(debut)` par un calcul de fenêtre (`windowStart` = 1er jour du mois `debut - 2 mois`, `windowEnd` = `fin`), utiliser cette fenêtre dans toutes les requêtes (`paiements`, `paiements_services`, `sp_paiements`, `vacances_paiements`, `depenses`), et clamper l'index de mois aux bornes au lieu d'ignorer les lignes hors grille. Accepter un paramètre `periode` (`{ mode: "annee" | "trimestre" | "mois", value }`) inclus dans la `queryKey` pour restreindre les colonnes retournées.
- `src/pages/finances/sections/BalanceSheet.tsx` : ajouter l'état local du filtre + les `Select` (vue / trimestre / mois), passer le filtre au hook, propager le libellé de période dans `sousTitre` de `exportPayload`.
- Aucune migration base de données nécessaire.
