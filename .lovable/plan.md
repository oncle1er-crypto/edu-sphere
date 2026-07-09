# Audit responsive & plan de correction progressive

## 1. Résumé de l'audit (état actuel)

L'application est conçue **desktop-first**. Après scan du code, voici les catégories de problèmes détectées :

### A. Navigation & Chrome global
- `TopNav` (barre principale) : liens en `overflow-x-auto` mais **titre de l'école caché < md**, aucun bouton hamburger, pas de drawer mobile.
- `AppLayout` : padding correct, mais pas de menu mobile latéral.
- `AppSidebar` existe mais **n'est pas monté** dans `AppLayout` — sidebar orpheline.

### B. Tableaux (le plus gros problème)
Tableaux larges sans wrapper `overflow-x-auto` ou avec largeur mini forcée :
- `finances/Payments.tsx`, `Unpaid.tsx`, `ClassSummary.tsx`, `StudentSummary.tsx`
- `classes/ClassesEffectifs.tsx`, `ClassesSchedule.tsx`
- `enseignants/StaffContracts.tsx`, `StaffSchedule.tsx`
- `emploi/WeeklyView.tsx` (`min-w-[750px]`), `TeacherAvailability.tsx`
- `examens/FinAnnee.tsx`, `GradingScales.tsx`, `QuickGradeEntry.tsx`
- `statistiques/SchoolsCompare.tsx`
- Bulletins/paiements/parents : mêmes patterns

→ Sur mobile : soit débordement, soit tableau illisible.

### C. Grilles fixes non-responsive (`grid-cols-3` sans breakpoint)
17 occurrences relevées, notamment :
- Dialogs financiers : `PaymentDialog`, `SettleDialog`, `DiscountDialog`
- `InscriptionWorkflowDialog`, `StudentDetailDrawer` (élèves + finances)
- `FinanceDashboard`, `Treasury`, `StudentSummary`
- `CanteenStock`, `VieScolaireBillets`, `QuickGradeEntry`
- `SubjectEditDialog`, `AppearanceSettings`

### D. Filtres & barres de recherche
Nombreuses barres de filtres en `flex` sans `flex-wrap`, avec `min-w-[220px]` → débordement < 480px.

### E. Modales (Dialog) — 339 occurrences
`DialogContent` shadcn par défaut a `max-h-[90vh]` mais **peu de dialogs custom ajoutent `overflow-y-auto`** sur leur contenu interne. Formulaires longs coupés sur mobile.

### F. Cibles tactiles
Boutons `h-8`, icônes `h-3 w-3` cliquables dans tableaux → < 44px minimum tactile.

### G. Home / Modules
`Home.tsx` utilise `lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.4fr)]` : OK. Mais `ModulesGrid` non vérifié.

### H. Cartes PDF / impressions
`SchoolCard`, `StudentIdCard` : dimensions physiques (format carte) — à laisser tel quel, non impacté par le responsive écran.

---

## 2. Stratégie de correction (progressive, non destructive)

**Principe** : aucune logique métier touchée. Uniquement classes Tailwind, wrappers layout, et 2-3 primitives utilitaires nouvelles.

### Phase 1 — Fondations partagées (petit effort, gros impact)
1. **`src/components/ui/table.tsx`** : envelopper le `<table>` dans un `div` avec `overflow-x-auto -mx-4 sm:mx-0` par défaut → corrige *tous* les tableaux d'un coup.
2. **Nouveau `src/components/ui/responsive-table.tsx`** : helper `<ResponsiveTable>` optionnel pour cas complexes.
3. **`DialogContent`** (`src/components/ui/dialog.tsx`) : ajouter `max-h-[90vh] overflow-y-auto` + `w-[calc(100vw-2rem)] sm:w-full` sur le wrapper.
4. **`TopNav`** : ajouter un bouton hamburger < md ouvrant un `Sheet` (drawer) listant les mêmes liens + section école.
5. **`AppLayout`** : baisser `px` mobile (`px-3`), `py-4`.
6. **`index.css`** : ajouter utilitaires `.touch-target` (min 44px), `.table-scroll`.

### Phase 2 — Grilles fixes → responsive
Remplacement mécanique `grid-cols-3` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` (ou `grid-cols-2 md:grid-cols-3` pour KPI compacts) dans les 17 fichiers listés en C.

### Phase 3 — Barres de filtres
Ajout de `flex-wrap gap-2 w-full` et `w-full sm:w-auto sm:min-w-[220px]` sur les inputs concernés (fichiers listés en D).

### Phase 4 — Pages sensibles (revue ciblée)
Revue visuelle + retouches sur :
- Finances (Payments, Unpaid, ClassSummary, Dashboard, Treasury)
- Élèves (Dashboard, Assignment, StudentDetailDrawer)
- Classes (Effectifs, Schedule, ClassesLayout tabs)
- Présences (DailyCall, StudentAbsences)
- Bulletins (BulletinSendDialog, BulletinOverrideDialog)
- Enseignants (StaffContracts, AssignmentsPanel)
- Paramètres (SettingsLayout tabs)

Pour chaque : vérifier tabs (`overflow-x-auto`), en-têtes de section, KPI cards.

### Phase 5 — Boutons tactiles
Passer les boutons d'action tableau de `h-8` à `h-9 sm:h-8`, icônes à `h-4 w-4`.

### Phase 6 — Vérification navigateur (Playwright)
Captures à 320, 375, 768, 1024, 1280 sur : Home, Élèves, Finances, Classes, Bulletins, Paramètres. Contrôle absence de scroll horizontal, lisibilité, tap targets.

---

## 3. Ce qui ne sera PAS modifié

- Aucune migration SQL, aucun hook Supabase, aucune permission.
- Aucun composant PDF (cartes physiques, bulletins imprimés).
- Le design system (couleurs bordeaux/or, typographie, cartes) reste identique.
- Aucune suppression de fonctionnalité.

---

## 4. Livrables

- Diff Tailwind sur ~30-40 fichiers.
- 1 nouveau composant (drawer mobile TopNav via `Sheet`).
- Modifs primitives : `table.tsx`, `dialog.tsx`.
- Rapport final : problèmes détectés / corrigés / à surveiller.

---

## 5. Ordre d'exécution recommandé

Je propose d'exécuter **Phases 1 → 2 → 3** dans un premier passage (impact maximal, faible risque), puis **Phase 4 → 5** dans un second passage, et enfin **Phase 6** (tests visuels). Cela vous laisse valider entre chaque passage.

**Confirmez-vous ce plan ?** Je peux aussi démarrer directement par la Phase 1 si vous préférez itérer plus vite.
