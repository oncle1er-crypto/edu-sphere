# Audit & plan de correction — Module Paiement

## Diagnostic des bugs encore présents

### 1. Encaissement non atomique (critique)
`PaymentDialog.handleSubmit` fait 2 requêtes séquentielles :
1. `INSERT INTO paiements (...)`
2. `UPDATE tranches SET paye = trancheReact.paye + montant`

Risques :
- **Snapshot React stale** : `trancheReact.paye` vient de l'état React. Si désynchronisé (cas que vous avez vécu), le `UPDATE` écrase la vraie valeur DB. Conséquence : la tranche pouvait afficher 116 666 même après 2 encaissements de 116 666 (l'`UPDATE` a écrit `0 + 116 666` au lieu de `116 666 + 116 666`).
- **Race condition** : deux comptables qui encaissent en même temps → un des deux paiements est "perdu" côté `tranches.paye`.
- **Échec partiel** : si l'`UPDATE` échoue après l'`INSERT`, on a un paiement orphelin (présent dans `paiements` mais pas reflété dans `tranches.paye`).

### 2. Pas de garde-fou DB contre le surpaiement
Rien n'empêche `SUM(paiements.montant) > tranches.montant`. Le client valide `montantNum <= restantTranche` mais c'est contournable (stale state, double-clic, deux sessions).

### 3. Pattern snapshot encore présent dans `Unpaid.tsx`
Les 3 états suivants stockent l'objet élève complet (pas l'id), donc deviennent obsolètes après un refetch :
- `paymentEleve` (ouvre PaymentDialog hors drawer)
- `smsEleve` (ouvre SmsPreviewDialog)
- `statusEleve` (ouvre StatusDialog)
Même classe de bug que celui déjà corrigé pour `selectedEleve`.

### 4. Double-clic Submit non bloqué côté UI
Le bouton est `disabled` pendant `saving` mais une frappe Entrée rapide ou un re-render peut encore déclencher 2 soumissions. À renforcer.

### 5. Reçus PDF non liés au paiement
`Receipts.tsx` lit `paiements`, mais en cas de paiement orphelin (cf. §1) le reçu existe sans contrepartie dans `tranches`. Aucune réconciliation.

---

## Plan de correction

### Étape 1 — Fonction RPC atomique `enregistrer_paiement`
Migration SQL : créer une fonction `SECURITY DEFINER` qui, dans une seule transaction :
1. Lit la tranche `FOR UPDATE` (verrou pessimiste).
2. Vérifie `paye + montant <= montant` → sinon `RAISE EXCEPTION 'Surpaiement interdit'`.
3. Insère dans `paiements`.
4. Met à jour `tranches.paye = paye + montant` et recalcule `statut`.
5. Renvoie l'id du paiement créé.

Bénéfices : élimine §1, §2, et la race condition.

### Étape 2 — Trigger de réconciliation `paiements → tranches`
Trigger `AFTER INSERT OR DELETE ON paiements` qui recalcule `tranches.paye = COALESCE(SUM(paiements.montant), 0)` et son `statut`. Filet de sécurité : si un paiement est supprimé (cas de votre nettoyage manuel), la tranche se met à jour automatiquement.

### Étape 3 — Refactor `PaymentDialog`
- Remplacer les 2 requêtes par un seul `supabase.rpc('enregistrer_paiement', {...})`.
- Désactiver toute soumission après le 1er clic via `useRef` (anti double-clic infaillible).
- Afficher l'erreur "Surpaiement interdit" si la DB la renvoie (cas concurrent).
- Recevoir `eleveId` plutôt que l'objet `eleve` complet → résoudre via `useFinanceData` interne ou via une prop dérivée du parent.

### Étape 4 — Appliquer le pattern anti-snapshot dans `Unpaid.tsx`
Convertir les 3 états restants (`paymentEleve`, `smsEleve`, `statusEleve`) en `…Id: string | null`, avec résolution `useMemo` depuis `ELEVES_SCOLARITE`. Identique à ce qui a été fait pour `selectedEleve`.

### Étape 5 — Garde-fou côté serveur sur la table
Ajouter un `CHECK (paye >= 0 AND paye <= montant)` sur `tranches` (déjà acceptable car la fonction RPC respecte l'invariant). Empêche toute écriture directe incorrecte.

### Étape 6 — Vérification automatique de cohérence
Petite vue SQL `v_paiements_incoherents` qui liste les tranches où `SUM(paiements) <> tranches.paye`. Exposable dans `FinanceDashboard` plus tard si utile.

### Étape 7 — Test manuel
1. Encaisser la 2ème tranche de Massandjé Gnahoré → vérifier T2 passe à "payée".
2. Tenter un 2ème encaissement immédiat de T2 → doit être impossible (T2 absente du select).
3. Ouvrir deux onglets et tenter d'encaisser la même tranche en parallèle → le 2ème doit recevoir "Surpaiement interdit".

---

## Détails techniques (référence)

**Fichiers impactés**
- Nouvelle migration : `enregistrer_paiement()` + trigger + check constraint.
- `src/pages/finances/components/PaymentDialog.tsx` : refactor RPC + anti double-clic.
- `src/pages/finances/sections/Unpaid.tsx` : 3 états → id + useMemo.

**Aucun changement** sur Invoices, Expenses, Suppliers, Payroll, Budget, Treasury — leurs dialogs ne sont que des formulaires de création, sans pattern snapshot.

**Compatibilité** : pas de changement de schéma destructif, les anciens paiements restent valides et seront recalculés par le trigger lors de la prochaine écriture.
