## Objectif

Permettre de rattraper facilement une **erreur d'affectation de grille tarifaire** (comme DIARRA AÏCHATA FADILAH, enregistrée en Maternelle 2 alors qu'elle est nouvelle en Grande Section — 150 000 FCFA).

## Ce qui change dans l'UI (`CustomFeeOverride.tsx`)

1. **Sélecteur enrichi** : chaque option du menu affichera explicitement la variante :
   - `Grande Section — Nouveau · 150 000 FCFA · 3 tr.`
   - `Grande Section — Ancien · 135 000 FCFA · 3 tr.`
   - `Maternelle 2 · 135 000 FCFA · 3 tr.`
   
   Récupéré depuis `grille_tarifs_niveaux` (variant + libellé + montant_total).

2. **Nouvelle case à cocher** *(cochée par défaut quand aucune grille n'était appliquée)* :
   > ☑ **Corriger une erreur d'affectation initiale** — recalcule aussi les tranches déjà encaissées.
   
   Avec un texte d'aide : *« Utile quand l'élève a été créé avec la mauvaise grille dès le départ. Les paiements existants restent liés à leurs tranches, mais les montants sont recalés sur la nouvelle grille. Un éventuel trop-perçu apparaîtra comme "Reste à payer" négatif. »*

3. **Bandeau récap avant validation** :
   *« Ancien total : 135 000 → Nouveau total : 150 000 (+15 000). 3 tranche(s) recalculée(s). »*

## Ce qui change côté base (fonction RPC)

Le composant appelle déjà `generer_tranches_eleve(_eleve_id)`. On ajoute un deuxième paramètre optionnel :

```
generer_tranches_eleve(_eleve_id uuid, _force_recalc boolean default false)
```

- Comportement par défaut (`false`) : inchangé — les tranches payées gardent leur montant.
- Avec `true` : les tranches déjà payées voient leur `montant` mis à jour selon la nouvelle grille, **sans toucher au `paye` ni aux `paiements`** (les reçus restent valides, aucun doublon). Le statut est recalculé (`payee` / `partielle` / `due`).

## Cas d'usage DIARRA AÏCHATA FADILAH

Une fois livré, l'utilisateur ouvrira sa fiche :
1. Sélectionne **« Grande Section — Nouveau · 150 000 FCFA »**
2. Laisse coché **« Corriger une erreur d'affectation initiale »**
3. Clique **Appliquer**
4. Total passe de 135 000 → 150 000, reste à payer = 50 000 (au lieu de 35 000), les 100 000 déjà encaissés sont préservés.

## Détails techniques

- **Fichier UI** : `src/pages/finances/components/CustomFeeOverride.tsx`
  - Étendre la requête `frais_scolarite` pour lire `variant` (via jointure ou colonne dénormalisée si dispo — sinon exposer un champ `libelle_complet` déjà formaté côté BDD).
  - Ajouter `Checkbox` shadcn + état `forceRecalc`.
  - Passer `_force_recalc: forceRecalc` à l'appel RPC.
  - Calculer le récap ancien/nouveau total pour le bandeau.
- **Migration SQL** : nouvelle version de `generer_tranches_eleve` avec le paramètre `_force_recalc`. Dans la branche `true`, l'`UPDATE` sur `tranches` s'applique à toutes les tranches (pas seulement `paye = 0`), et recalcule `statut` en fonction de `paye` vs nouveau `montant`.
- **Aucun changement** sur `paiements` ni sur les reçus PDF.

## Hors périmètre

- Pas de modification des données existantes de DIARRA maintenant — l'utilisateur pourra appliquer la correction lui-même via la nouvelle UI dès qu'elle sera en place (ou je peux le faire en une opération séparée après livraison, si demandé).
- Pas de changement sur la logique de génération automatique lors de l'inscription.
