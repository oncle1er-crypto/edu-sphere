## Plan — Rendre 100% fonctionnels les 10 points inertes de Cantine & Transport

### 1. Base de données (une seule migration)

Nouvelles tables (toutes multi-tenant `ecole_id` + RLS + GRANT authenticated/service_role) :

- **`transport_carburant`** — plein de carburant : `vehicule_id`, `date_plein`, `litres`, `prix_litre`, `montant`, `km_compteur`, `chauffeur_id?`, `notes`.
- **`transport_incidents`** — `vehicule_id`, `chauffeur_id?`, `date_incident`, `type` (panne, accident, retard, autre), `gravite`, `description`, `statut` (ouvert/traite).
- **`transport_maintenance`** — `vehicule_id`, `type` (vidange, révision, réparation, contrôle technique), `date_operation`, `km_compteur`, `cout`, `garage`, `prochaine_echeance_date?`, `prochaine_echeance_km?`, `statut`.

Nouvelle RPC **`enregistrer_paiement_facture(_facture_id, _montant, _mode, _reference, _recu_par)`** (SECURITY DEFINER) :
- Contrôle rôle (`admin` / `directeur` / `comptable`), même école.
- Contrôle `_montant > 0` et `_montant <= montant − montant_paye`.
- Insère dans `paiements` (avec `facture_id`, `categorie` = celle de la facture).
- Met à jour `factures.montant_paye` et `statut` (`emise` → `partielle` → `payee`).
- Retourne l'`id` du paiement.
- GRANT EXECUTE authenticated.

### 2. Encaissement + reçu PDF (Cantine & Transport)

- Nouveau composant partagé **`src/pages/finances/components/InvoicePaymentDialog.tsx`** :
  moyen de paiement, montant, référence, aperçu reste dû → appelle la RPC → toast + téléchargement automatique du reçu PDF + action WhatsApp + SMS parent (mêmes patterns que `PaymentDialog`).
- Extension de **`src/lib/downloadReceipt.ts`** / **`generateDocumentsPDF.ts`** : support `type: "facture"` (entête = libellé facture + catégorie cantine/transport, réutilise logo/mentions/souche existants).
- Dans **`CanteenBilling.tsx`** et **`TransportBilling.tsx`** : colonne « Actions » avec bouton **Encaisser** (masqué si soldée) et bouton **Réimprimer** (dernier paiement lié). Permission `finances.update`.

### 3. Hooks React Query pour les nouvelles tables

- **`useTransportCarburant.ts`**, **`useTransportIncidents.ts`**, **`useTransportMaintenance.ts`** : liste + add + update + delete (patterns existants type `useCantine`).

### 4. Réécriture des sections mock

- **`TransportFuel.tsx`** : table réelle + dialog « Ajouter un plein » (véhicule, litres, prix/L auto-calcul du total, km) + total du mois + consommation moyenne.
- **`TransportIncidents.tsx`** : table réelle + dialog CRUD + filtre par statut, badge gravité.
- **`TransportMaintenance.tsx`** : table réelle + dialog CRUD + surlignage lignes dont `prochaine_echeance_date` < J+30.
- **`TransportAlerts.tsx`** : requêtes live sur `vehicules` (`date_assurance`, `date_visite_technique`) + `chauffeurs` (`date_expiration_permis`) → alerte si < 30 jours ; tri par urgence.
- **`CanteenStats.tsx`** : agrégats réels — repas servis par mois (`cantine_planning`), coût moyen (moyenne `stocks_cantine`), abonnés actifs, incidents.
- **`TransportStats.tsx`** : consommation par véhicule (agrégat `transport_carburant`), km parcourus, coût moyen par élève (dépenses transport / abonnés), incidents/mois.

### 5. Rapports & exports (branchement des boutons)

- **`CanteenReports.tsx`** et **`TransportReports.tsx`** :
  - « Liste des abonnés (Excel) » → CSV via `abonnements_cantine` / `abonnements_transport` + jointure élèves.
  - « Factures du mois (PDF) » → PDF groupé via `factures` filtrées par catégorie et période.
  - « Menus de la semaine (PDF) » (cantine) → PDF de `menus_cantine`.
  - « Inventaire stock (Excel) » (cantine) → CSV `stocks_cantine`.
  - « Synthèse financière (PDF) » → total facturé / encaissé / impayés du mois.
  - « Consommation carburant (Excel) » et « Maintenance (PDF) » (transport).
  - Rapport HACCP : reste un placeholder (nécessite données HACCP non modélisées) — bouton désactivé + tooltip explicite.

### 6. Permissions

- Nouvelles clés déjà couvertes par `cantine.*` / `transport.*` existants ; on ajoute juste les vérifications `has_permission` sur les boutons **Encaisser** (`update`), **Ajouter/Supprimer** (`create`/`delete`) et **Télécharger** (`export`).

## Détails techniques

- Aucune modification aux tables existantes (`factures`, `paiements`, `vehicules`, `chauffeurs`) — on lit leurs colonnes actuelles.
- Utilise `paiements.categorie` (déjà en base) pour distinguer scolarité / cantine / transport dans le grand livre et la trésorerie.
- Les nouveaux hooks suivent le pattern `useQuery`/`useMutation` avec invalidation par école + année.
- Les PDF réutilisent le template existant (`generateDocumentsPDF`) → cohérence graphique garantie.

## Livrables

1. Migration SQL (3 tables + RPC + grants + policies).
2. `src/pages/finances/components/InvoicePaymentDialog.tsx`.
3. `src/hooks/useTransportCarburant.ts`, `useTransportIncidents.ts`, `useTransportMaintenance.ts`.
4. Refonte : `CanteenBilling`, `TransportBilling`, `TransportFuel`, `TransportIncidents`, `TransportMaintenance`, `TransportAlerts`, `CanteenStats`, `TransportStats`, `CanteenReports`, `TransportReports`.
5. Extension : `src/lib/downloadReceipt.ts` + `src/lib/generateDocumentsPDF.ts` (type facture).

## Hors périmètre

- Génération automatique périodique des factures (cron) — l'utilisateur les crée manuellement aujourd'hui, comportement conservé.
- Module HACCP complet (formulaires hygiène, températures) — bouton grisé.
- Géolocalisation temps réel des bus — non demandé.
