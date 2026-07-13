## Contexte / diagnostic

En inspectant la base pour l'élève affiché sur ta capture, j'ai trouvé la cause de chaque bug.

### 1. Tranches doublées

L'élève `695b6bc4…` (Adjoua/6ème) possède DEUX échéanciers actifs simultanés :

- `Scolarité — CE1-CE2` (frais `0bfa6c8c`) → T1 Octobre 80 000 / T2 Novembre 45 000 / T3 Janvier 40 000
- `Scolarité — 6ème-5ème` (frais `49d2deec`) → T1 Octobre 85 000 / T2 Novembre 55 000 / T3 Janvier 40 000

C'est ce qui donne « T1 Octobre 85 000 Soldée » puis « T1 Octobre 80 000 Non soldée » etc. dans le drawer.

**Origine :** la fonction PL/pgSQL `generer_tranches_eleve` ne bloque la re-génération que si l'élève a déjà des tranches **pour le même `frais_id`**. Quand la classe / le niveau change (ex. l'élève passe de CE1 à 6ème), un nouveau `frais_scolarite` est résolu par la grille et un second lot de tranches est inséré à côté de l'ancien — sans purge ni détection.

### 2. « Reçus & quittances » vide et « Encaissé = 0 »

Les deux écrans filtrent les paiements par `tranche_id IN (tranches de l'année active)` via un `!inner` join sur `frais_scolarite.annee_id` (voir `Receipts.tsx` et `useFinanceData.ts`).

- Si le drawer courant s'est ouvert alors que le contexte `AcademicPeriodContext` pointe encore sur `b0000000…` (année verrouillée 2025-2026) au lieu de `d0aa1e69…` (active 2026-2027), toutes les tranches de tes 5 paiements du jour se retrouvent hors scope → totaux 0 et liste vide. Ta capture montre bien des dates `2026-10-15` (année active) donc l'appli **est** en année active côté drawer, mais les composants Receipts / dashboards ré-utilisent l'`activeAnneeId` stocké dans `localStorage` — il peut rester coincé.
- De plus, `Receipts.tsx` fait `.in("tranche_id", trancheIds)` : cela **exclut aussi tout paiement avec `tranche_id = null`** (aucun dans ta base, mais fragile).

## Plan de correction

### A. Empêcher et nettoyer les doublons de tranches

Migration Postgres :

1. **Nettoyage des données existantes** : pour chaque `(eleve_id)`, garder uniquement le `frais_id` correspondant au cycle actuel de la classe de l'élève et supprimer les tranches orphelines des autres `frais_id` **si elles n'ont aucun paiement rattaché**. Si des paiements existent sur les anciennes tranches, on les conserve mais on les marque via un statut/annotation neutre pour éviter la duplication d'échéancier (choix : détacher `frais_id` ne suffit pas — on garde donc les tranches soldées, on supprime uniquement celles à `paye = 0`).
2. **Réécrire `generer_tranches_eleve`** : avant l'INSERT, si l'élève a déjà des tranches pour un `frais_id` différent du `v_frais_id` cible et qu'aucune de ces tranches n'a de paiement, faire un `DELETE` de ces anciennes tranches. Sinon (paiements existants), lever une exception explicite (« Échéancier déjà en cours avec paiements — utilisez la migration d'échéancier »).
3. **Contrainte d'intégrité** : ajouter un index unique `UNIQUE (eleve_id, numero)` sur `tranches` pour interdire toute future duplication de numéro par élève au niveau DB.

### B. Fiabiliser le scoping paiements / reçus par année

1. Dans `useFinanceData.ts` et `Receipts.tsx`, remplacer la logique « fetch tranches puis `.in("tranche_id", …)` » par un `paiements` scopé directement via un **inner join sur `tranches.frais_scolarite.annee_id`** — plus court, plus robuste, et inclut correctement les paiements liés à toute tranche de l'année active.
2. Dans `AcademicPeriodContext`, à l'initialisation, vérifier que la valeur en `localStorage` correspond toujours à une année existante ET non `verrouillee` ; sinon retomber sur l'année `active` en DB. Cela évite qu'un ancien cache pointe sur `b0000000` alors que la scolarité 2026-2027 est active.

### C. Vérification finale

Après migration :

- `SELECT eleve_id, numero, count(*) FROM tranches GROUP BY 1,2 HAVING count(*)>1;` doit renvoyer 0.
- Le drawer de l'élève `695b6bc4` doit lister 3 tranches uniques (T1 Octobre 85 000 Soldée, T2 Novembre 55 000, T3 Janvier 40 000).
- `Reçus & quittances` doit afficher les 5 paiements du 2026-07-13.
- La carte « Encaissé » du dashboard doit afficher ≥ 170 000 FCFA.

## Détails techniques

Fichiers touchés :

- `supabase/migrations/*` — nouvelle migration : nettoyage + refonte de `generer_tranches_eleve` + `CREATE UNIQUE INDEX tranches_eleve_numero_uniq ON tranches(eleve_id, numero) WHERE frais_id IS NOT NULL;` (conditionnel pour rester compatible avec les tranches historiques déjà en base).
- `src/pages/finances/useFinanceData.ts` — remplacer le double round-trip par une seule requête paiements `select("*, tranches!inner(frais_scolarite!inner(annee_id))")` filtrée sur `annee_id`.
- `src/pages/finances/sections/Receipts.tsx` — même refactor.
- `src/context/AcademicPeriodContext.tsx` — validation de la valeur `localStorage` à l'init (refuser une année `verrouillee` obsolète).

Aucune interaction UI côté élève ne change — seule la source de données devient fiable.
