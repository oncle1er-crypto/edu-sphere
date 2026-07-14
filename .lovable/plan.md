## Correction & diagnostic

Merci pour la précision. J'ai vérifié en base : l'élève **BELLA ANO** a bien un versement de **25 000 FCFA en mode Wave** enregistré le 14/07/2026, rattaché à la tranche 1 de l'année active 2026-2027. Ce versement **est** un encaissement (le mode « Wave » est classé `encaissement`, comme Espèces, Orange Money, MTN, Moov, Virement et Chèque).

### Ce que devrait afficher la carte

Avec ces données, **« Dont encaissé » devrait afficher 25 000 FCFA**, pas 0. La règle du système est bien : tout paiement enregistré via l'atelier d'inscription (module Élèves) passe par la même procédure `enregistrer_paiement` que les encaissements du module Finances, donc il compte comme encaissement dès que le mode choisi n'est pas *Remise / Bourse / Prise en charge*.

### Diagnostic à mener

Le fait que la carte affiche 0 alors que la donnée en base est correcte est un **bug d'affichage**. Deux causes possibles :

1. **Affichage périmé** — le panneau a été ouvert avant que `useFinanceData` ne refetch après le versement. Un rafraîchissement de la page devrait corriger l'affichage.
2. **Bug de récupération** dans `useFinanceData.ts` — le filtre `paiements.tranche_id IN (…)` combiné à `frais_scolarite!inner(annee_id)` pourrait exclure certains paiements dans un cas limite.

### Étapes proposées

1. Vous demander de **rafraîchir la page** et de rouvrir la fiche de BELLA ANO pour confirmer si « Dont encaissé » passe à 25 000.
2. Si oui → ajouter un `refetch()` automatique à l'ouverture du panneau pour éviter le décalage.
3. Si non → corriger la requête paiements dans `src/pages/finances/useFinanceData.ts` (probablement en fiabilisant le rattachement paiement ↔ année via `tranche_id`) et vérifier que la carte se met à jour.

### Fichiers concernés

- `src/pages/finances/useFinanceData.ts` (récupération paiements + calcul `totalEncaisse`)
- `src/pages/finances/components/StudentDetailDrawer.tsx` (déclenchement du refetch à l'ouverture)

Pouvez-vous confirmer, après un rafraîchissement (Ctrl/Cmd+R), si « Dont encaissé » affiche bien **25 000** pour cet élève ? Je saurai alors s'il faut simplement forcer le refetch ou corriger la requête.