## Module « Cours de vacances » — Plan d'intégration

Module **totalement indépendant** des élèves réguliers. Nouvelles tables préfixées `vacances_*`, nouvelles pages sous `/cours-vacances`, aucune modification des tables ou modules existants (`eleves`, `classes`, `paiements`, etc.).

### 1. Base de données (migration unique)

Toutes les tables sont scopées par `ecole_id` + `annee_id` (multi-tenant, cohérent avec l'existant). RLS activée, GRANT explicites, policies basées sur `has_ecole_role` / `has_permission`.

**Tables créées :**

- **`vacances_sessions`** — une session = une édition (ex. « Vacances 2026 »)
  - `libelle`, `date_debut`, `date_fin`, `statut` (preparation/active/cloturee), `ecole_id`, `annee_id`
  - Permet de séparer les éditions d'une année à l'autre.

- **`vacances_classes`**
  - `session_id`, `nom` (CP1, 6e…), `montant` (numeric), `capacite` (nullable), `actif` (bool)

- **`vacances_eleves`** — indépendante de `eleves`
  - `session_id`, `classe_id` (→ vacances_classes), `nom`, `prenom`, `sexe`, `date_naissance`, `contact_parent`, `etablissement_origine` (nullable), `observation`, `date_inscription`, `statut_paiement` (payé/non_payé, calculé au fil des paiements)

- **`vacances_paiements`**
  - `eleve_id` (→ vacances_eleves), `classe_id`, `montant_attendu`, `montant_paye`, `date_paiement`, `mode` (especes/mobile_money/virement/autre), `statut`, `observation`
  - Trigger : recalcule `statut_paiement` de l'élève.

- **`vacances_enseignants`**
  - `session_id`, `nom`, `prenom`, `telephone`, `classe_id` (nullable), `matiere`, `honoraire_prevu`, `observation`
  - Colonnes calculées via vue : `montant_paye`, `reste_a_payer`.

- **`vacances_honoraires`** — paiements versés aux enseignants
  - `enseignant_id`, `montant`, `date_paiement`, `mode`, `observation`

**Grants + RLS** : `authenticated` (SELECT/INSERT/UPDATE/DELETE via policies), `service_role` (ALL). Policies :
- Lecture/écriture : `has_ecole_role(auth.uid(), ecole_id, 'admin'|'directeur'|'comptable')` OU `has_permission(auth.uid(), ecole_id, 'cours_vacances', 'view'|'create'|…)`.

**Module ajouté à `app_modules`** avec `module_key = 'cours_vacances'` pour intégration à la matrice de permissions existante.

### 2. Architecture front

Suivre exactement le pattern des modules existants (`/pages/cantine`, `/pages/bibliotheque`) :

```
src/pages/cours-vacances/
  VacancesLayout.tsx              ← sidebar + Outlet (comme CanteenLayout)
  sections/
    VacancesDashboard.tsx
    VacancesInscriptions.tsx
    VacancesClasses.tsx           ← Classes / Tarifs
    VacancesPaiements.tsx
    VacancesEnseignants.tsx
    VacancesHonoraires.tsx
    VacancesRapports.tsx
  hooks/
    useVacancesSessions.ts
    useVacancesClasses.ts
    useVacancesEleves.ts
    useVacancesPaiements.ts
    useVacancesEnseignants.ts
    useVacancesHonoraires.ts
  lib/
    exportVacancesPDF.ts          ← jsPDF (déjà utilisé)
    exportVacancesExcel.ts        ← xlsx (déjà utilisé)
```

**Routing** — ajout dans `src/App.tsx` :
```
/cours-vacances → VacancesLayout
  ├── tableau
  ├── inscriptions
  ├── classes
  ├── paiements
  ├── enseignants
  ├── honoraires
  └── rapports
```

**Navigation** — ajout d'une entrée « Cours de vacances » dans `AppSidebar.tsx` (section « Autres ») avec icône `Sun` ou `Palmtree` (lucide-react). Aucune modification du `TopNav` (top-level items existants conservés).

### 3. Fonctionnalités par page

**Tableau de bord** — `KpiCard` (composant existant) :
Total élèves inscrits · Élèves par classe (BarChart) · Total encaissé · Impayés · Total maîtres · Honoraires prévus · Honoraires payés · **Résultat net = encaissé − honoraires payés**.

**Inscriptions** : formulaire (Dialog shadcn) + tableau avec recherche, filtre classe, filtre statut paiement, actions (voir/éditer/supprimer). Montant attendu auto-rempli depuis la classe.

**Classes / Tarifs** : CRUD avec toggle actif/inactif.

**Paiements** : formulaire (élève auto-complété → classe & montant auto-remplis), tableau avec filtres, totaux par classe et global affichés en pied de tableau.

**Maîtres/Enseignants** : CRUD + colonnes calculées (montant payé, reste à payer).

**Honoraires** : tableau récap par maître + Dialog « enregistrer un paiement d'honoraire ».

**Rapports** : 7 rapports (Liste inscrits · Par classe · Payés · Non payés · Maîtres · Situation honoraires · Résumé financier) avec boutons **Imprimer** (window.print stylé) + **PDF** (jsPDF) + **Excel** (xlsx).

### 4. Permissions

Utilise `Can` (composant existant) et `usePermissions` avec `module = 'cours_vacances'`.
- Admin/Directeur : accès total.
- Comptable : voir + gérer paiements/honoraires.
- Autres rôles : selon `user_permissions` (matrice existante — la nouvelle clé apparaît automatiquement).

### 5. Design

- Réutilise tokens sémantiques existants (rouge bordeaux/jaune poussin) définis dans `index.css`.
- Composants shadcn (`Card`, `Table`, `Dialog`, `Input`, `Select`, `Badge`).
- Layout responsive (grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` pour les KPI, tableaux avec scroll horizontal sur mobile).
- Icônes `lucide-react` : `Sun`, `Users`, `BookOpen`, `Wallet`, `GraduationCap`, `Receipt`, `FileText`.

### 6. Garanties

- Aucune table existante modifiée.
- Aucun code des modules `Élèves`, `Classes`, `Finances` touché.
- Toutes les nouvelles tables préfixées `vacances_` → zéro collision.
- Module isolable/désinstallable en supprimant les 6 tables + le dossier `src/pages/cours-vacances/`.

### Ordre d'implémentation

1. Migration SQL (tables + RLS + grants + entrée app_modules)
2. Hooks Supabase
3. Layout + routing + entrée sidebar
4. 7 sections (Dashboard → Rapports)
5. Exports PDF/Excel
6. Test manuel du parcours complet (créer session → classe → inscription → paiement → maître → honoraire → rapport)
