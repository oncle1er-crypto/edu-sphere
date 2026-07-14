## Contexte

La carte « Inscrits (payés) » du tableau de bord Élèves compte aujourd'hui les élèves dont le champ `statut` vaut `inscrit`/`actif`, sans regarder les paiements réels. Le libellé est trompeur : un élève sans versement peut y figurer, et un élève « pré-inscrit » ayant déjà payé n'y apparaît pas.

## Nouvelle définition (validée)

- **Inscrits** = élèves de l'année active ayant **au moins un versement enregistré** sur la 1ère tranche (tranche d'inscription).
- **Pré-inscrits** = élèves de l'année active **sans aucun versement** enregistré.

Le champ `statut` de l'élève n'est plus utilisé pour ces deux compteurs.

## Ce qui change

Un seul fichier front : `src/pages/eleves/sections/StudentsDashboard.tsx`.

1. Charger, en plus de l'existant, la table `paiements` (colonnes `eleve_id`, `tranche_id`, `montant`) filtrée par `ecole_id`, restreinte aux paiements de l'année active (via jointure sur `tranches.annee_id` ou équivalent déjà utilisé côté Finances).
2. Identifier la **1ère tranche** de chaque élève via `tranches` (ordre le plus bas pour son cycle/classe). Un versement compte pour « Inscrit » s'il est rattaché à cette 1ère tranche **et** que `montant > 0`.
3. Pour chaque élève de l'année active :
   - **Inscrit** s'il possède au moins un paiement sur sa 1ère tranche,
   - **Pré-inscrit** sinon.
4. Recalculer `inscrits`, `preInscrits`, `actifsTotal` à partir de ces ensembles. Adapter la répartition garçons/filles et par cycle pour utiliser le même ensemble « actifs = inscrits ∪ pré-inscrits » (cohérence visuelle).
5. Renommer la carte **« Inscrits (payés) »** → **« Inscrits »**. Laisser « Pré-inscrits » tel quel.
6. Ajouter un petit sous-texte discret sur les deux cartes : *« basé sur les versements de la 1ère tranche »*.

## Détails techniques

- Requêtes ajoutées dans le `useEffect` existant, à côté de `fetchPresence` / `fetchRetard`, strictement scopées par `ecole_id` et année active.
- Construction d'un `Set<eleve_id>` des élèves ayant au moins un paiement sur leur 1ère tranche, puis dérivation des deux compteurs.
- Si aucune tranche n'existe pour le cycle d'un élève (cas limite), on retombe sur : « a-t-il au moins un paiement toutes tranches confondues ? » → Inscrit, sinon Pré-inscrit.
- Aucun changement de schéma, aucune migration, aucune modification des autres écrans (Finances, fiche élève, workflow d'inscription).
- Vérification post-changement : recharger `/eleves/tableau` et comparer les deux compteurs avec le tableau « Paiements du jour » (Finances).

## Hors périmètre

- Pas de modification de la logique `statut` de l'élève.
- Pas de modification du tableau des paiements ni du dashboard Finances.
