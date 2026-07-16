# Audit du module Paiement / Finances — synthèse et plan de correction

## Ce qui est cohérent (rassurant ✅)

Le cœur du calcul est solide : toutes les vues (tableau de bord finances, drawer élève, impayés, relances, SMS) lisent la même source de vérité — les lignes `tranches` en base — qui sont recalculées automatiquement quand tu appliques une **grille tarifaire personnalisée** (`frais_id_override`). La fonction serveur `generer_tranches_eleve` traite bien l'override **en priorité absolue** avant la grille de classe, un trigger reconcilie chaque paiement avec sa tranche, et les statuts (payée / partielle) sont bien réévalués. Un trop-perçu apparaît correctement comme reste négatif à l'écran. Pas de « double remise » possible : le concept `eleves.remise` n'existe pas — les remises sont des lignes de paiement normales.

## Incohérences confirmées (à corriger ❌)

### 1. Le reçu individuel PDF n'est pas filtré par année scolaire
`src/lib/downloadReceipt.ts` (lignes 30-37) somme **tous** les paiements et **toutes** les tranches de l'élève, toutes années confondues. Pour un élève qui a un historique (redoublement, réinscription), le « Total dû » et « Total payé » imprimés sur le reçu **ne correspondent pas** à ce qui est affiché dans l'app (qui, elle, est scopée à l'année active via `useFinanceData`). Résultat : chiffres non réconciliables entre l'écran et le PDF remis à la famille.

→ **Fix** : ajouter le filtre `annee_id` sur les requêtes `tranches` et `paiements` dans `downloadReceipt.ts`, comme dans `useFinanceData.ts`.

### 2. Le reçu global masque les trop-perçus
`src/lib/downloadGlobalReceipt.ts` ligne 135 : `const reste = Math.max(0, eleve.resteDu)`. Un parent en crédit de 15 000 FCFA (après baisse de grille override) voit `-15 000` à l'écran mais **`0 FCFA` sur le PDF**, sans mention qu'il est créditeur. Cela contredit directement le tooltip de `CustomFeeOverride` qui promet « un trop-perçu apparaît comme reste à payer négatif ».

→ **Fix** : retirer le `Math.max(0, …)` et afficher un libellé explicite (« Trop-perçu / Crédit famille : X FCFA ») quand `resteDu < 0`.

### 3. Deux logiques de calcul « total dû » divergentes
`downloadReceipt.ts` refait ses propres requêtes DB, alors que `downloadGlobalReceipt.ts` réutilise l'objet `eleve` déjà scopé. Toute évolution future dans un seul des deux fichiers créera une divergence silencieuse.

→ **Fix** : extraire une fonction unique `computeEleveTotals(eleveId, ecoleId, anneeId)` dans `src/lib/eleveTotals.ts` et l'utiliser dans les deux générateurs de reçu.

## Risques à traiter (à surveiller ⚠️)

### 4. `_force_recalc = true` par défaut sur le trigger de changement de classe
Le trigger `eleves_generer_tranches` appelle `generer_tranches_eleve` sans passer `_force_recalc`, donc la valeur par défaut `true` s'applique. Conséquence : **tout changement de classe recalcule rétroactivement les montants des tranches déjà encaissées** selon la nouvelle grille — même sans intention de corriger une erreur (ex. simple hausse tarifaire).

→ **Fix** : changer le default de `generer_tranches_eleve` à `_force_recalc boolean DEFAULT false` (migration). Le composant `CustomFeeOverride` continue à passer explicitement `true` quand la case « Corriger une erreur d'affectation » est cochée.

### 5. Statut `retard` non persisté après recalcul
`generer_tranches_eleve` ne connaît que `due / payee / partielle` — jamais `retard`. L'UI reste correcte (recalcul à l'affichage), mais tout export CSV ou requête basée sur `tranches.statut` en base sous-évalue les retards.

→ **Fix** : ajouter dans le `CASE` de la fonction : `WHEN tr.paye <= 0 AND tr.echeance < CURRENT_DATE THEN 'retard'`.

### 6. Factures manuelles non resynchronisées
`useFactures.ts` fige `montant` à la création. Après un override, les factures déjà émises gardent l'ancien montant. Non bloquant tant que les factures ne sont pas utilisées comme référence de dû (le vrai dû reste dans `tranches`).

→ **Fix** : afficher un badge « ⚠ Grille modifiée depuis l'émission » dans `Invoices.tsx` quand la date de la facture est antérieure au dernier `updated_at` des tranches de l'élève. Pas de régénération automatique — juste un signal visuel.

### 7. Grille standard : somme des tranches non validée
`useGrilleTarifs.ts` n'empêche pas de saisir une grille dont `Σ tranches ≠ montant_total`. La branche override est mathématiquement garantie, mais pas la branche grille classique.

→ **Fix** : ajouter dans `GrilleTarifEditor.tsx` une validation front qui bloque la sauvegarde si l'écart dépasse 0 FCFA, avec message clair.

## Détails techniques

**Fichiers frontend à modifier**
- `src/lib/downloadReceipt.ts` — filtre `annee_id`, utilise `computeEleveTotals`
- `src/lib/downloadGlobalReceipt.ts` — retire `Math.max(0, …)`, ajoute libellé crédit, utilise `computeEleveTotals`
- `src/lib/eleveTotals.ts` **(nouveau)** — source unique de calcul totalDu / totalPaye / resteDu scopés par année
- `src/pages/finances/sections/Invoices.tsx` — badge « grille modifiée »
- `src/pages/finances/components/GrilleTarifEditor.tsx` — validation Σ tranches = montant_total

**Migration SQL**
- Nouvelle migration `update_generer_tranches_eleve.sql` :
  - `_force_recalc boolean DEFAULT false` (au lieu de `true`)
  - Ajout du statut `retard` dans les 3 blocs `CASE` (branches override, grille classe standard, fallback)

**Hors périmètre (à confirmer avant tout changement)**
- `regenerer_tranches_pre_inscrits` : non lue en détail, à vérifier séparément si tu confirmes ce plan.
- Aucune modification du trigger `reconcilier_tranche_paiements` — il fonctionne bien.
- Aucune modification du calcul en mémoire `useFinanceData.ts` — c'est la source de vérité correcte.

---

Confirme-moi que je peux implémenter ces 7 correctifs (ou dis-moi lesquels écarter), et je passe en mode build.
