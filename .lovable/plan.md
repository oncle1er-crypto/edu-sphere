## Module « Services ponctuels »

Module autonome pour gérer les paiements exceptionnels (tests d'entrée, ventes de tenues, autres services ponctuels). Aucune table métier existante n'est modifiée ; seule la barre latérale gagne une entrée. Toute la logique tient dans un dossier isolé `src/pages/services-ponctuels/` + nouvelles tables préfixées `sp_`.

### 1. Base de données (migration unique)

Nouvelles tables (toutes multi-tenant `ecole_id`, RLS + GRANT complets) :

- `sp_services` — catalogue : `nom`, `slug`, `description`, `prix`, `actif`, `accepte_partiel`, `gere_stock`, `couleur`, `icone`. Seed : `test_entree`, `tenue_scolaire`.
- `sp_candidats` — `numero` (séquence par école), `nom`, `prenom`, `sexe`, `date_naissance`, `classe_demandee`, `ecole_origine`, `parent`, `telephone`, `date_test`, `statut` (enum `en_attente|programme|absent|present|admis|refuse`), `converti_eleve_id` (FK `eleves`, nullable).
- `sp_ventes_tenues` — `acheteur_type` (`eleve|candidat`), `eleve_id`/`candidat_id`, `quantite`, `prix_unitaire`, `montant_total`, `mode_paiement`, `statut` (`paye|remis|attente|annule`), `caissier_id`, `observations`.
- `sp_paiements` — `numero`, `service_id`, `beneficiaire_type` (`eleve|candidat|libre`), `eleve_id`/`candidat_id`/`beneficiaire_libre`, `montant_du`, `montant_paye`, `remise`, `mode_paiement` (enum incluant Wave/Orange/MTN/Moov/virement/chèque/espèces), `caissier_id`, `date_paiement`, `observations`, `annule_le`, `motif_annulation`.

RLS : lecture pour tous les rôles de l'école ; écriture selon permissions (`admin`, `directeur`, `comptable`, `secretaire`, `caissier`). Aucune migration touchant `eleves` — la conversion candidat→élève passe par un simple `INSERT` côté client via le hook élèves existant.

RPC :
- `sp_convertir_candidat(_id uuid) returns uuid` — crée un `eleves` à partir des champs du candidat (sans classe s'il n'y a pas d'affectation), stocke `converti_eleve_id`, trace dans `audit_logs`.
- `sp_annuler_paiement(_id uuid, _motif text)` — admin/directeur, remplit `annule_le`/`motif_annulation`, trace.

### 2. Routes & navigation

- Ajout d'un item `services-ponctuels` dans `src/lib/roleDefaults.ts` (admin, directeur, comptable, secretaire).
- Nouvelle route parent `/services-ponctuels` dans `src/App.tsx` protégée par `RequirePerm module="services_ponctuels"`.
- `AppSidebar.tsx` : nouvelle entrée dans `otherItems` avec icône `Ticket`.
- `TopNav.tsx` inchangé (le sidebar est le canal principal).

### 3. Arborescence code

```text
src/pages/services-ponctuels/
  ServicesPonctuelsLayout.tsx     (menu latéral local, style FinanceLayout)
  hooks/
    useSpServices.ts
    useSpCandidats.ts
    useSpVentes.ts
    useSpPaiements.ts
  sections/
    SpDashboard.tsx
    SpPaiements.tsx
    SpTestsEntree.tsx
    SpVentesTenues.tsx
    SpCatalogue.tsx
    SpRapports.tsx
    SpParametres.tsx
  components/
    ServicePaymentDialog.tsx      (encaissement, partiel selon service)
    CandidatFormDialog.tsx
    ConvertCandidatButton.tsx
    VenteTenueDialog.tsx
  lib/
    generateSpReceipt.ts          (wrapper autour de generateDocumentsPDF)
```

### 4. Réutilisation stricte

- Composants UI : `Card`, `Table`, `Dialog`, `Select`, `Button`, `Badge`, toasts.
- Filtres rapports : composant partagé `ReportFilters` déjà en place.
- PDF : réutilisation de `src/lib/generateDocumentsPDF.ts` (type `paiement` existant) + logo/école via `useEcole`.
- Ticket thermique : réutilisation du chemin existant si présent, sinon A4 uniquement.
- Permissions : `usePermissions`, `Can`, `RequirePerm`.
- Modes de paiement : mêmes libellés/typage que le module Finances.

### 5. Sécurité & audit

- Toute mutation via RPC ou requête filtrée par `ecole_id`.
- Annulation/suppression → insertion dans `audit_logs`.
- Rôles :
  - `admin`, `directeur` : tout, y compris annulation.
  - `comptable`/`caissier` : consulter catalogue, encaisser paiements & ventes, imprimer reçus.
  - `secretaire` : CRUD candidats, planifier tests, convertir en élève.

### 6. Étapes atomiques

1. Migration SQL (tables, enums, RLS, RPC, seed catalogue).
2. Ajout du module dans `roleDefaults` + entrée sidebar + route lazy.
3. `ServicesPonctuelsLayout` + squelette des 7 sections (placeholders).
4. Hooks CRUD (catalogue → candidats → ventes → paiements).
5. Dialogs encaissement + génération de reçu.
6. Dashboard + Rapports (KPIs, filtres période, exports).
7. Paramètres (édition tarifs/couleurs/icônes/actif) + tests visuels de non‑régression (élèves, finances, cartes, cantine, transport toujours OK).

### 7. Non-régression

- Aucun fichier hors du nouveau dossier n'est modifié sauf : `App.tsx` (ajout route), `AppSidebar.tsx` (ajout item), `roleDefaults.ts` (ajout clé), migration DB. Aucun renommage, aucun changement de logique existante.
