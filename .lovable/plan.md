
# Modifier le montant d'un paiement (admin uniquement)

Permettre à un administrateur de corriger un paiement mal saisi (montant, mode, référence, tranche), depuis :
- le module **Finances → Paiements** (liste),
- la **fiche élève** (drawer finances / historique des paiements).

Les non-admins ne voient tout simplement pas le bouton "Modifier".

## 1. Backend — RPC `modifier_paiement`

Nouvelle fonction SQL `SECURITY DEFINER` :
- Paramètres : `_paiement_id uuid`, `_montant numeric`, `_mode text`, `_reference text`, `_motif text`.
- Contrôles :
  - L'appelant doit avoir le rôle `admin` sur l'`ecole_id` du paiement (via `has_role`) — sinon `RAISE EXCEPTION 'not_authorized'`.
  - Le paiement doit exister et appartenir à l'école.
  - `_montant > 0`.
  - Si un `tranche_id` est présent, le nouveau montant ne doit pas faire dépasser le total dû de la tranche : `SUM(paiements) - ancien + nouveau <= tranche.montant`.
- Effet : `UPDATE paiements SET montant, mode, reference, updated_at = now()`, puis rappel du recalcul de statut de tranche (via le trigger existant qui met à jour `statut/paye` sur la tranche).
- Journalisation dans `audit_logs` (action `paiement.modifier`, ancien/nouveau montant, motif, `user_id`).
- Retourne `void`.

Grants : `GRANT EXECUTE ON FUNCTION public.modifier_paiement ... TO authenticated;`.

Aucune modification de la RLS de `paiements` : les writes restent bloqués côté client, seule cette RPC (definer) autorise la correction.

## 2. Frontend — composant `EditPaymentDialog`

Nouveau fichier `src/pages/finances/components/EditPaymentDialog.tsx` :
- Props : `paiement` (id, montant actuel, mode, référence, tranche + reste), `open`, `onOpenChange`, `onSaved`.
- Champs : montant, mode (mêmes options que `PaymentDialog`), référence, **motif de correction** (obligatoire, min 5 caractères).
- Validation : `montant > 0` et `montant <= reste_tranche + ancien_montant`.
- Appelle `supabase.rpc('modifier_paiement', {...})`, toast succès/erreur, `onSaved()`.

## 3. Intégrations UI (admin uniquement)

Gate via `useIsAdmin()` (déjà existant, couvre `admin` + `directeur` — on restreint ici à `admin` uniquement en utilisant `usePermissions().isAdmin` qui, lui, ne renvoie vrai que pour `admin`).

- **`src/pages/finances/sections/Payments.tsx`** : dans le tableau des paiements récents, ajouter une colonne "Actions" avec un bouton crayon "Modifier" rendu uniquement si `isAdmin`. Ouvre `EditPaymentDialog`.
- **`src/pages/finances/components/StudentDetailDrawer.tsx`** : dans la liste "Historique des paiements", ajouter le même bouton crayon par ligne, visible seulement pour admin.

Après édition : rafraîchir les données via les callbacks existants (`onPaymentRecorded` / reload du drawer / `useFinanceData`).

## 4. Sécurité & traçabilité

- Toute correction laisse une ligne dans `audit_logs` (qui a modifié, quand, ancien vs nouveau montant, motif).
- Le contrôle "admin" est fait **dans la RPC** (côté serveur), pas seulement dans l'UI : un utilisateur non-admin qui appellerait la RPC serait rejeté.
- Pas de suppression de paiement dans cette itération — uniquement correction du montant/mode/référence.

## Livrables

1. Migration : fonction `modifier_paiement` + grants.
2. `src/pages/finances/components/EditPaymentDialog.tsx` (nouveau).
3. Modifs `Payments.tsx` et `StudentDetailDrawer.tsx` : bouton "Modifier" conditionnel + branchement du dialog.
