## Objectif
Calculer automatiquement les honoraires prévus de chaque maître = **500 FCFA × nombre d'élèves inscrits dans sa classe affectée**, mis à jour en temps réel à chaque inscription/désinscription/changement de classe. Le solde restant va à l'école.

## Approche
Rendre `vacances_enseignants.honoraire_prevu` **calculé automatiquement** côté base de données via un trigger, plutôt que saisi manuellement. Un paramètre `tarif_par_eleve` (défaut 500 FCFA) est stocké par école pour permettre un ajustement futur.

## Détails techniques

### 1. Migration SQL
- Ajouter une colonne `tarif_honoraire_par_eleve` (integer, défaut 500) sur `ecoles` (ou table de config vacances) pour paramétrer le tarif.
- Créer fonction `recalculer_honoraires_vacances(p_classe_id uuid)` qui met à jour `honoraire_prevu` de tous les enseignants affectés à cette classe :
  `honoraire_prevu = COUNT(vacances_eleves de la classe) × tarif`.
- Créer trigger `trg_vac_eleves_honoraires` sur `vacances_eleves` (AFTER INSERT/UPDATE OF classe_id/DELETE) qui appelle la fonction pour la classe concernée (ancienne + nouvelle sur UPDATE).
- Créer trigger `trg_vac_enseignants_honoraires` sur `vacances_enseignants` (AFTER INSERT/UPDATE OF classe_id) qui recalcule pour l'enseignant nouvellement affecté.
- Recalcul initial : exécuter la fonction pour toutes les classes existantes.

### 2. UI — `VacancesEnseignants.tsx`
- Retirer la saisie manuelle de `honoraire_prevu` du formulaire (ou passer en lecture seule avec message : « Calculé automatiquement : 500 FCFA × nb élèves »).
- Ajouter une colonne « Nb élèves » dans le tableau des maîtres (dérivée du contexte `eleves` déjà chargé).

### 3. UI — `VacancesHonoraires.tsx`
- Afficher un bandeau informatif : « Tarif : 500 FCFA / élève inscrit. Part école = montant scolarité − honoraires versés. »
- La colonne « Prévu » reflète automatiquement le calcul.

### 4. Paramétrage (optionnel léger)
- Dans `VacancesLayout` ou onglet Classes, ajouter un petit champ « Tarif par élève » lisant/écrivant `ecoles.tarif_honoraire_par_eleve` (accessible admin uniquement).

### 5. Realtime
Le hook `useVacancesData` recharge déjà après chaque `save`/`remove`. Les honoraires prévus seront donc à jour dès qu'une inscription est créée via l'app. Aucun changement de hook nécessaire.

## Fichiers touchés
- Migration SQL (nouveau)
- `src/pages/cours-vacances/sections/VacancesEnseignants.tsx`
- `src/pages/cours-vacances/sections/VacancesHonoraires.tsx`
- (optionnel) `src/pages/cours-vacances/sections/VacancesClasses.tsx` pour paramétrer le tarif
