## Plan de correction du module Paiements

### Lot 1 — Boutons factices
1. **`Payments.tsx`** — bouton « Saisir paiement » en haut du registre : le remplacer par un vrai bouton qui ouvre `PaymentDialog`. Si aucun élève n'est sélectionné, ouvrir d'abord un petit picker (liste filtrable réutilisant `filtered`).
2. **`StudentSummary.tsx`** — en-tête de la fiche synthèse :
   - Câbler les 3 icônes de contact : `Phone` → `tel:${eleve.telephone}`, `MessageSquare` (SMS) → `sms:`, `MessageSquare` (email) → `mailto:`. Retirer le doublon d'icône (utiliser `Mail` pour l'email).
   - Bouton « Imprimer » → générer un vrai PDF via `downloadGlobalReceipt({ ecoleId, eleve })` (comme le « Reçu global » du drawer).
3. **`Unpaid.tsx`** — bouton « Email groupé » : masquer purement et simplement (retirer le bouton) en attendant l'implémentation ultérieure.

### Lot 2 — Valeurs codées en dur
4. **`Unpaid.tsx`** :
   - Calculer « Relances ce mois » à partir de `relances` filtré sur le mois courant (`date_envoi.startsWith(YYYY-MM)`), au lieu de la valeur codée `87`.
   - Remplacer le libellé codé « année 2025-2026 » par `activeAnnee?.libelle` issu de `useAcademicPeriod`.
5. **KPIs « Encaissé » (Option B choisie)** — renommer clairement pour ne plus mélanger encaissement caisse et couvert total :
   - `FinanceDashboard.tsx` (ligne 137) : renommer la carte en **« Couvert »**, sous-texte « dont {totalEncaisse} encaissé · {totalRemises} remises · {taux}% ».
   - `Payments.tsx` (ligne 103) : renommer la carte KPI en **« Couvert »** avec le même sous-texte détaillé.

### Lot 3 — Grand livre OHADA (`Ledger.tsx`)
6. Réécrire les écritures comptables correctement :
   - **Encaissement paiement** : `DÉBIT 571 Caisse` (si mode = `especes`) ou `DÉBIT 521 Banque` (autres modes) `/ CRÉDIT 411 Clients — {Nom Prénom}`.
   - **Règlement dépense validée** : `DÉBIT 401 Fournisseurs / CRÉDIT 521 Banque` (ou 571 selon mode si dispo sur la dépense, sinon 521 par défaut).
   - **Émission de facture** (à ajouter, source = table `factures`) : `DÉBIT 411 Clients / CRÉDIT 706 Prestations de services`. Pour la période active seulement, tri chronologique commun.
7. Petit mapping mode → compte trésorerie centralisé en haut du fichier (`especes` → 571, `wave` / `orange_money` / `mtn_money` / `moov_money` / `virement` / `cheque` → 521).

### Lot 4 — Robustesse des requêtes Supabase
8. **`Ledger.tsx`** : appliquer la même stratégie que `useFinanceData` — supprimer le `.in("tranche_id", safeIds)` (URL trop longue en cas de gros volumes) et filtrer les paiements côté SQL via le join `tranches!inner(frais_scolarite!inner(annee_id))` avec `.eq("tranches.frais_scolarite.annee_id", activeAnnee.id)`.
9. **`useFinanceData.ts`** : ajouter une pagination sur la requête `paiements` (boucle `range(offset, offset+999)` tant que la page retourne 1000 lignes) pour rester correct au-delà de la limite PostgREST de 1000.
10. **`Receipts.tsx`** — `buildSinglePDF` et `buildMergedPDF` : filtrer `total_du` et `total_paye` sur l'année scolaire active via join `frais_scolarite!inner(annee_id)` et `.eq(... annee_id, activeAnnee.id)`. Sans cela, un élève avec historique multi-années voit ses totaux cumulés à tort sur le reçu.

### Lot 5 — UX drawer (petit polish)
11. **`StudentDetailDrawer.tsx`** : afficher un petit spinner discret (dans l'en-tête, à droite du titre) pendant que le `refetch` déclenché à l'ouverture est en cours, pour éviter le flash de données périmées. Requiert d'exposer un `refetching` depuis `useFinanceData` (petit booléen mis à `true` en début de `fetch()` et `false` à la fin) et de le passer en prop au drawer.

---

## Fichiers à modifier

- `src/pages/finances/sections/Payments.tsx` (lots 1, 2)
- `src/pages/finances/sections/StudentSummary.tsx` (lot 1)
- `src/pages/finances/sections/Unpaid.tsx` (lots 1, 2)
- `src/pages/finances/sections/FinanceDashboard.tsx` (lot 2)
- `src/pages/finances/sections/Ledger.tsx` (lots 3, 4)
- `src/pages/finances/sections/Receipts.tsx` (lot 4)
- `src/pages/finances/useFinanceData.ts` (lots 4, 5)
- `src/pages/finances/components/StudentDetailDrawer.tsx` (lot 5)

Aucun changement de schéma DB, aucune migration. Uniquement du code React + requêtes Supabase existantes.