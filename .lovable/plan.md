## Objectif

Rendre les modules **Cantine** et **Transport** cohérents avec la grille tarifaire (mensuel/trimestriel), permettre à l'administrateur de supprimer un abonnement, et rendre l'impression / réimpression du reçu double-souche accessible partout.

## 1. Réimpression du reçu (double-souche)

Le bouton **imprimante** existe déjà dans « Facturation cantine » et « Facturation transport » (colonne Actions, dès qu'un versement a été fait). Il régénère le reçu double-souche via `downloadInvoiceReceipt`.

Ajouts prévus :
- Ajouter la même colonne **Actions → Réimprimer / Historique** sur la page **Abonnés cantine** et **Abonnés transport**, en listant en dessous les factures liées à l'élève (dépliable).
- Petit encart d'aide « Où trouver un reçu ? » qui pointe vers `Facturation → icône imprimante`.

## 2. Périodicité selon la grille tarifaire

Aujourd'hui, la création d'un abonnement demande un « montant mensuel » figé. Il faut brancher la **grille tarifaire services** (`grille_tarifs_services`, périodicité `mensuel` | `trimestriel`).

Comportement :
- Dans le dialog « Nouvel abonnement » (cantine et transport), remplacer la saisie manuelle par un **choix de tarif** issu de la grille tarifaire de l'année en cours.
- Le tarif choisi impose :
  - la **périodicité** (mensuelle ou trimestrielle),
  - le **libellé**,
  - les **tranches** (dates + montants).
- Un bouton **« Générer les factures »** sur la ligne de l'abonné crée automatiquement une facture par tranche (une par mois OU une par trimestre) via la table `factures` catégorie `cantine`/`transport`. Chaque facture reprend le montant et la date d'échéance de la tranche.
- Bouton « Générer les factures en masse » en tête de tableau pour créer les échéances de tous les abonnés actifs d'un coup.

## 3. Suppression admin

- Bouton corbeille sur chaque abonné, visible uniquement pour les rôles `admin` / `direction` (via `useIsAdmin`).
- Confirmation obligatoire.
- Deux options dans le dialog :
  - **Désactiver** (statut = `resilie`) — recommandé si des factures existent déjà.
  - **Supprimer définitivement** — bloqué si des factures avec paiement existent (message d'erreur clair), sinon `DELETE` cascade sur `abonnements_cantine` / `abonnements_transport`.

## Détails techniques

- Nouveau hook `useServiceInvoicing.ts` : `genererFacturesAbonnement(abonnementId)` et `genererFacturesEnMasse(serviceType)` — insère les rangs `factures` à partir des tranches de la grille.
- Nouvelle RPC SQL `generer_factures_service(_ecole_id, _abonnement_id, _service_type)` pour idempotence (skip si numéro déjà existant sur la tranche).
- Colonnes `abonnements_cantine` / `abonnements_transport` : ajouter `grille_id uuid` (FK vers `grille_tarifs_services`).
- `CanteenSubscribers.tsx`, `TransportSubscribers.tsx` : refonte du dialog + colonne Actions (Générer factures, Historique, Réimprimer, Désactiver, Supprimer).
- Réutiliser `downloadInvoiceReceipt` + `InvoicePaymentsHistoryDialog` déjà existants.

## Fichiers touchés

- `supabase/migrations/…_service_subscriptions.sql` (nouvelle colonne + RPC)
- `src/hooks/useServiceInvoicing.ts` (nouveau)
- `src/pages/cantine/sections/CanteenSubscribers.tsx`
- `src/pages/transport/sections/TransportSubscribers.tsx`

Confirmez-vous ce plan ? Je peux enchaîner directement avec la migration puis les écrans.