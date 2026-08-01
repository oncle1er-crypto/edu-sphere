# Bilan comptable — solde par colonne, remises et modes de paiement

## Objectif

Rendre le bilan comptable complet et auto-porteur : un solde de caisse correct par mois, un bilan de synthèse en fin de tableau, la mention des remises accordées en bas de document, et la répartition des encaissements par mode de paiement.

## Ce qui change

### 1. Solde de caisse par colonne + bilan de fin

- La ligne SOLDE DE CAISSE reste « total entrées − total sorties » de chaque colonne (elle est déjà calculée ainsi, mais un mois sans mouvement affiche « - » ce qui la rend illisible).
- Affichage : dans la ligne de solde, les valeurs nulles s'affichent « 0 » et non « - », pour montrer clairement le solde de chaque mois.
- Nouvelle ligne SOLDE CUMULÉ sous le solde mensuel : cumul progressif mois par mois, dont la dernière colonne est le solde de clôture de la période.
- Nouveau bloc « BILAN DE LA PÉRIODE » sous le tableau : total entrées, total sorties, solde net, solde cumulé de clôture — mis en valeur.

### 2. Remises (bourses / prises en charge)

- Les remises ne sont pas des encaissements : elles restent hors du tableau de trésorerie.
- Nouveau bloc en fin de document « Remises accordées (hors trésorerie) » : montant total des remises de la période, nombre d'élèves concernés, et rappel que le total dû est réduit d'autant sans mouvement de caisse.

### 3. Répartition par mode de paiement

- Nouveau bloc « Répartition par mode de paiement » en fin de document : Espèces, Wave, Orange Money, MTN Money, Moov Money, Virement, Chèque — avec nombre d'opérations et montant, plus une ligne de total.
- Le périmètre couvre tous les encaissements comptés dans les entrées : scolarité, factures cantine/transport, échéanciers services, services ponctuels, cours de vacances.

### 4. Exports CSV / Excel / PDF

- Les trois exports reprennent : lignes du tableau + ligne solde cumulé + bloc bilan + bloc remises + bloc modes de paiement.
- Le PDF utilise le bloc de synthèse existant (modes de paiement + total mis en valeur), avec le solde de clôture comme total en évidence.

## Détails techniques

- `src/hooks/useBilanComptable.ts`
  - Ajouter aux requêtes le champ `mode` (et `mode_paiement` selon la table) pour `paiements`, `paiements_services`, `sp_paiements`, `vacances_paiements`, et agréger un `modes: { label, count, total }[]` normalisé sur les libellés existants du projet.
  - Agréger les remises de la période (source : remises de scolarité déjà exploitées par `useFinanceData`) en `remises: { total, nbEleves }`, filtrées par cycle comme le reste.
  - Exposer `soldeCumuleLigne: BilanLigne` (cumul déjà calculé en interne) et `bilan: { entrees, sorties, net, cloture }`.
  - Le cumul est recalculé sur la période affichée, en repartant du solde d'ouverture de la période (cumul des mois précédents) afin que « Par mois » et « Par trimestre » restent cohérents.
- `src/pages/finances/sections/BalanceSheet.tsx`
  - Ligne SOLDE CUMULÉ ajoutée au tableau ; formatage à zéro explicite pour les lignes de solde.
  - Cartes/bloc « Bilan de la période », bloc remises et tableau des modes de paiement ajoutés sous le tableau, dans le style shadcn existant.
  - `exportPayload` enrichi : lignes supplémentaires pour CSV/Excel, `pdfSummary.modes` + `grandTotal` = solde de clôture, note remises en sous-titre du bloc.

Aucune migration SQL, aucune modification de RLS.
