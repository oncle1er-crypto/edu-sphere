
## Contexte

Sur le module **Services ponctuels**, trois problèmes / demandes :

1. Chaque service (test d'entrée, tenue, autres) doit avoir sa **caisse dédiée** et ses **rapports imprimables séparément**.
2. Les **tenues** doivent être suivies par **classe** avec ventilation **Fille / Garçon** ; la vente doit dérouler un workflow : classe → stock F/G affiché → recherche élève → paiement.
3. Reçus PDF : le **logo ne s'affiche pas** et les montants contiennent des **caractères parasites** (petites cases) dans l'affichage.

## Diagnostic des reçus (confirmé par lecture des fichiers)

- `SpVentesTenues.tsx` et `SpTestWorkflow`/`SpPaiements` lisent `currentEcole.logo_url` et `.sigle`, mais `EcoleContext` ne les expose PAS (colonnes non sélectionnées). D'où `logoUrl: undefined` → logo absent.
- `generateSpReceipt.fmt()` utilise `Intl.NumberFormat("fr-FR")` qui insère des **espaces fines insécables (U+202F)** entre milliers ; Helvetica de jsPDF ne les rend pas → cases noires visibles à l'écran.

## Plan de correction

### 1. Fix reçus (immédiat, s'applique à tous les services)

- `src/pages/services-ponctuels/lib/generateSpReceipt.ts` :
  - Remplacer `fmt` par un formatage manuel utilisant un **espace normal** (`Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA"`).
  - Charger le logo via `loadImage` (déjà en place) — l'appelant doit fournir `logoUrl`.
- Créer un helper `useEcoleFull()` (ou étendre `EcoleContext`) qui garantit la présence de `logo_url` + `sigle` en interrogeant `ecoles` si absents. Simple : ajouter `logo_url` et `sigle` à la sélection dans `EcoleContext.tsx` (mapping ligne 50-52 + type `Ecole`).
- Vérifier les 3 appelants (`SpVentesTenues`, `SpPaiements`, `SpTestWorkflow`) : ils passent déjà `e.logo_url` → sera automatiquement corrigé une fois le contexte enrichi.

### 2. Caisse par service + rapports séparés

- Le champ `service_id` existe déjà sur `sp_paiements` ; pas de migration nécessaire.
- Refonte de `src/pages/services-ponctuels/sections/SpRapports.tsx` :
  - Ajouter un **sélecteur de service** (Tous / service X) au-dessus des filtres période.
  - Filtrer paiements + ventes selon le service choisi.
  - Ajouter un bouton **« Rapport de caisse » par service** dans une nouvelle carte listant chaque service actif avec son total encaissé et 2 boutons (PDF / CSV) — chaque export produit un rapport dédié au service (en-tête, période, table détaillée, totaux par mode de paiement).
- Étendre `SpDashboard` : afficher les **totaux par caisse** (une tuile par service).

### 3. Stock tenues par classe + genre + workflow de vente

**Migration SQL** :

- Nouvelle table `public.sp_stock_tenues` :
  - `id`, `ecole_id`, `classe_id` (FK `classes`), `genre` ('F'|'G'), `stock_actuel int`, `seuil_alerte int default 5`, `prix_unitaire numeric` (optionnel — override du service), timestamps.
  - Unicité `(ecole_id, classe_id, genre)`.
  - GRANT authenticated + service_role, RLS : `ecole_id = current_ecole` + rôles admin/directeur/comptable/secrétaire pour écrire.
- Ajouter à `sp_ventes_tenues` : `classe_id uuid` et `genre text check (genre in ('F','G'))`.
- Trigger de stock : mettre à jour `sp_stock_tenues.stock_actuel -= quantite` à l'insertion d'une vente (statut `paye`/`remis`), et l'inverse à l'annulation. Remplace le trigger actuel qui décrémente `sp_services.stock_actuel`.

**Hook** :

- `useSpStockTenues.ts` : CRUD + realtime (via même pattern qu'existant).

**Paramètres** :

- Ajouter section « Stock tenues par classe » dans `SpParametres.tsx` : tableau éditable (classe × genre) permettant d'ajuster stock/seuil/prix.

**Workflow de vente refondu (`VenteTenueDialog.tsx`)** :

```text
Étape 1 : Sélection classe   → dropdown des classes
          [affiche stock F : n | stock G : m]
Étape 2 : Genre + recherche élève
          → Select genre (auto-filtre les élèves de la classe)
          → SearchCombobox élève (nom/matricule) parmi les élèves de la classe/genre
          → Alternative : "Acheteur libre" (texte)
Étape 3 : Quantité + prix (pré-rempli depuis stock ou service)
          → contrôle stock disponible pour classe+genre
          → mode de paiement + statut
Étape 4 : Validation → insert vente (avec eleve_id/classe_id/genre) → reçu PDF
```

- Mettre à jour `useSpVentes.save()` pour accepter `classe_id`, `genre`, `eleve_id`.

## Fichiers touchés

- **Backend** : 1 migration (table `sp_stock_tenues`, colonnes sur `sp_ventes_tenues`, nouveau trigger).
- **Contexte** : `src/context/EcoleContext.tsx` (ajout `logo_url`, `sigle`).
- **Reçus** : `src/pages/services-ponctuels/lib/generateSpReceipt.ts` (fix `fmt`).
- **Hooks** : nouveau `useSpStockTenues.ts` ; extension `useSpVentes.ts`.
- **UI** : `VenteTenueDialog.tsx` (refonte workflow), `SpRapports.tsx` (filtre + rapports par service), `SpParametres.tsx` (section stock tenues), `SpDashboard.tsx` (tuiles caisses), `SpVentesTenues.tsx` (colonnes classe/genre).

## Hors-scope

- Pas de refonte visuelle du reçu (déjà validée précédemment).
- Pas de multi-genre au-delà de F/G.
- Le stock reste géré manuellement (pas de commandes fournisseurs).
