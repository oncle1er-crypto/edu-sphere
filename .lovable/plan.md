## Plan — Transition d'année simplifiée + isolation stricte par année active

### Objectif

Remplacer l'assistant multi-étapes actuel par **un seul écran "Passage de classe"** qui permet, pour chaque classe de l'année en cours, de faire passer ses élèves vers la classe suivante de l'année à venir en quelques clics — avec **clôture définitive** ou **restauration** possible, et **filtrage automatique** de toute l'application sur l'année active.

---

### 1. Écran unique « Passage de classe »

Chemin : `Écoles → Transition d'année` (on remplace le stepper actuel).

Interface :

```text
Année source : [2025-2026 ▾]      Année cible : [2026-2027 ▾ | + Créer]

┌────────────────────────────────────────────────────────────────┐
│ Classe source     Élèves   →   Classe cible          Action    │
├────────────────────────────────────────────────────────────────┤
│ CP1 A              32      →   [CP2 A     ▾]         [Tous ▾] │
│ CP2 A              28      →   [CE1 A     ▾]         [Tous ▾] │
│ CM2 A              25      →   [6ème A    ▾]         [Tous ▾] │
│ 3ème B             30      →   [Sortants  ▾]         [Tous ▾] │
└────────────────────────────────────────────────────────────────┘

Par défaut : mapping auto PS→MS→…→CM2→6ème→…→Tle.
Action par classe : "Tous promus" / "Choisir élève par élève"
  → ouvre un panneau latéral pour marquer redoublants / exclus / sortants.

[Aperçu]  [Lancer le passage]
```

Un seul bouton **Lancer le passage** appelle une RPC unique `executer_passage_classe(_ecole_id, _annee_source, _annee_cible, _plan jsonb)` qui :

- crée les inscriptions de l'année cible (statut `pre_inscrit`, matricule conservé),
- applique redoublement / exclusion / sortie selon `_plan`,
- reconduit affectations pédagogiques (`classe_matieres`, `enseignant_matieres`) et abonnements cantine/transport,
- trace tout dans `parcours_scolaire` + une nouvelle table `passages_classe` (journal réversible).

Pas de brouillon / validation / verrouillage en 3 étapes : une seule action, journalisée.

---

### 2. Clôture définitive & Restauration

Deux boutons en tête d'écran, à côté du sélecteur d'année source :

- **Clôturer définitivement l'année** → RPC `cloturer_annee(_ecole_id, _annee_id)` : passe l'année en `cloturee`, rend les données lecture seule (RLS : bloque INSERT/UPDATE/DELETE sur les tables scoped `annee_id` quand `statut = 'cloturee'`).
- **Restaurer / Rouvrir** → RPC `restaurer_annee(_ecole_id, _annee_id)` : repasse en `verrouillee` (modifiable par admin) OU **annule un passage** via le journal `passages_classe` (supprime les inscriptions créées dans l'année cible pour ce lot, restaure les statuts source).

Le journal `passages_classe` stocke : `id, ecole_id, annee_source, annee_cible, plan jsonb, resultat jsonb, execute_par, execute_le, annule_le`. Chaque exécution est réversible tant que l'année cible n'est pas clôturée.

---

### 3. Isolation stricte par année active

Aujourd'hui certains écrans montrent toutes les années confondues. Objectif : **quand une année est active, seules ses données s'affichent partout** (élèves, classes, paiements, notes, présences, cantine, transport, bulletins, etc.).

Mise en œuvre :

- Un **`AcademicPeriodContext`** déjà présent expose `anneeActiveId`. On l'utilise comme filtre par défaut dans **tous** les hooks data (`useEleves`, `useClasses`, `useNotes`, `useFactures`, `usePaiements`, `usePresences`, `useAbonnementsCantine`, `useAbonnementsTransport`, `useBulletinsPaie`, `useEvaluations`, `useRetards`, `useSanctionsPresences`…).
- Ajout d'un sélecteur global "Année : 2026-2027 ▾" dans le header, mais **verrouillé sur l'année active** pour les non-admins. Les admins peuvent temporairement consulter une année clôturée (lecture seule).
- Les **modalités de paiement** (grille tarifs, tranches, frais scolarité) sont déjà scoped par `annee_id` : on vérifie que `useGrilleTarifs`, `useFactures`, `useTranches` filtrent bien sur `anneeActiveId` sans exception.

---

### 4. Détails techniques

**Nouvelles migrations SQL :**

1. Table `passages_classe` (journal réversible) + RLS + GRANT.
2. Colonne `statut` de `annees_scolaires` : ajout de la valeur `cloturee` (enum ou check).
3. RPC `executer_passage_classe` (SECURITY DEFINER, admin/directeur + `user_belongs_to_ecole`).
4. RPC `cloturer_annee`, `restaurer_annee`, `annuler_passage_classe` (idem).
5. Trigger `annees_scolaires_readonly_when_cloturee` : bloque les mutations sur tables filles quand année parent `= cloturee` (sauf admin).

**Fichiers frontend modifiés :**

- `src/pages/ecoles/sections/SchoolsYearTransition.tsx` → réécrit en écran unique (tableau classes source → cible).
- `src/hooks/useYearTransition.ts` → simplifié : un seul appel RPC + journal.
- Nouveau `src/hooks/usePassagesClasse.ts` (historique + annulation).
- `src/context/AcademicPeriodContext.tsx` → devient source unique de `anneeActiveId`.
- Audit et ajout de `.eq('annee_id', anneeActiveId)` dans les hooks data listés au §3.
- Nouveau composant `YearScopeBadge` dans le header : "Année active : 2026-2027" (badge + sélecteur admin).

**Non touché :** logique des modules eux-mêmes (bulletins, finances, cantine…) — uniquement leur filtre `annee_id`.

---

### 5. Ordre d'exécution

1. Migration `passages_classe` + statut `cloturee` + RPC (§4.1-4.4).
2. Trigger lecture-seule année clôturée (§4.5).
3. Réécriture écran `SchoolsYearTransition` + hook.
4. Audit + patch des hooks data pour filtrage strict `anneeActiveId`.
5. Badge/sélecteur d'année dans le header.

Chaque étape est indépendante et réversible. Aucune donnée existante supprimée.
