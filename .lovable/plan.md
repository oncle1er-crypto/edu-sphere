## Objectif

Rendre le module **Statistiques globales** entièrement fonctionnel et alimenté par les vraies données de la base (plus de valeurs codées en dur), avec des KPIs cohérents entre les sections et des exports/rapports réellement générés.

## État actuel

| Section | État | Problème |
|---|---|---|
| Vue d'ensemble | Réel (partiel) | Ratio & effectifs OK. « Taux recouvrement » basé sur `tranches.paye`/`montant` toutes années confondues → fausse la lecture. Pas de filtre année active. |
| Comparatif écoles | Mock | Utilise `useEcoles` mais les colonnes `effectif_eleves`, `effectif_enseignants`, `nb_classes`, `revenu_mensuel` ne sont jamais recalculées (toujours 0). |
| Élèves | Réel | OK. Manque : nouveaux inscrits/mois, taux redoublement, moyenne d'âge. |
| Enseignants | Réel | OK. Manque : ancienneté moyenne, ratio élèves/prof, matières couvertes. |
| Présences | Réel | Pas de filtre période (agrège tout l'historique). Manque évolution mensuelle. |
| Examens & notes | Réel | KPI « Réussite (≥10) » affiche `—`. Pas de filtre période/classe. |
| Finances | Réel via `useFinanceData` | OK, mais année active non filtrée. |
| Cantine | **Mock** | Toutes les valeurs sont codées en dur (« 18 240 », « 942 »…). |
| Transport | **Mock** | Idem, valeurs fictives. |
| Bibliothèque | Réel | OK. |
| Rapports & exports | **Faux** | Les 6 boutons affichent juste un toast, aucun fichier généré. |
| Configuration | Cosmétique | Switches non persistés. Hors périmètre. |

## Plan d'action

### 1. Sélecteur global de période (nouveau)
Ajouter un petit `PeriodPicker` en haut du layout Stats (Année active — défaut / 30 j / 90 j / Année scolaire précédente). Il pose une valeur dans un contexte `StatsScopeContext` que chaque section lit pour filtrer ses requêtes.

### 2. Sections à brancher sur la base

**Cantine (`CanteenStatsGlobal.tsx`)** — remplacer intégralement les mocks par :
- `abonnements_cantine` (count par statut, par école) → Abonnés actifs.
- `cantine_planning` (repas servis sur la période) → Repas servis.
- `cantine_incidents` → KPI incidents.
- Coût moyen : `depenses` catégorie cantine / repas servis (fallback « — » si vide).

**Transport (`TransportStatsGlobal.tsx`)** — remplacer les mocks par :
- `vehicules` (count) → Véhicules.
- `lignes_transport` (count actives) → Lignes actives.
- `abonnements_transport` → Élèves transportés.
- Taux de remplissage = abonnements / Σ `vehicules.capacite`.

**Vue d'ensemble** : ajouter un filtre `annee_id = active` sur `tranches` pour un taux de recouvrement réaliste ; ajouter KPI « Nouveaux inscrits ce mois ».

**Examens** : calculer réellement le taux de réussite (`notes.filter(n ≥ 10).length / notes.length`) et ajouter filtre période.

**Présences** : ajouter filtre période et un `BarChart` d'évolution mensuelle (12 derniers mois).

### 3. Comparatif écoles (`SchoolsCompare.tsx`)
Enrichir `EcoleContext.rowToEcole` : effectuer, à côté du fetch des écoles, un `COUNT` groupé par `ecole_id` sur `eleves` (actifs), `enseignants` (actifs), `classes`, et un `SUM(tranches.paye)` de l'année active pour `revenu_mensuel` (renommé « Revenu — année active »). Les colonnes de la table deviennent alors réelles.

### 4. Rapports & exports (`GlobalReports.tsx`)
Implémenter réellement les 6 rapports :
- **Rapport mensuel consolidé (PDF)** : jsPDF + autoTable, agrège élèves/enseignants/finances/présences du mois écoulé.
- **Export Excel KPIs réseau (XLSX)** : via `xlsx` (déjà utilisé ailleurs si présent, sinon ajouter). Un onglet par module.
- **Rapport académique annuel (PDF)** : moyennes par classe/matière + taux réussite.
- **Rapport financier consolidé (XLSX)** : par école, tranches attendues/payées/restant dû.
- **Rapport présences (PDF)** : par classe, taux + absences.
- **Rapport opérationnel (PDF)** : cantine, transport, biblio agrégés.

Regrouper les générateurs dans `src/lib/statsReports.ts` (une fonction par rapport). Réutiliser `generateFinanceReports.ts` là où c'est pertinent.

### 5. Cohérence & qualité
- Toutes les requêtes strictement scopées par `ecoleId` (multi-tenant).
- Extraire les patterns récurrents en un mini-hook `useStatsQuery(fn, deps)` pour éviter la duplication du `useEffect + loading + Loader2`.
- Tous les KPIs numériques passent par `.toLocaleString("fr-FR")`, tous les montants via `fcfa()`.
- Aucun `Math.random`, aucun tableau mock ne subsiste dans `src/pages/statistiques/`.

## Fichiers touchés

- Modifiés : `StatsLayout.tsx`, `sections/GlobalDashboard.tsx`, `sections/SchoolsCompare.tsx`, `sections/AttendanceStats.tsx`, `sections/ExamsStats.tsx`, `sections/FinanceStats.tsx`, `sections/CanteenStatsGlobal.tsx`, `sections/TransportStatsGlobal.tsx`, `sections/GlobalReports.tsx`, `context/EcoleContext.tsx`.
- Nouveaux : `src/pages/statistiques/context/StatsScopeContext.tsx`, `src/pages/statistiques/components/PeriodPicker.tsx`, `src/pages/statistiques/hooks/useStatsQuery.ts`, `src/lib/statsReports.ts`.

## Hors périmètre

- Section **Configuration** (persistance des switches) — à faire dans un lot séparé.
- Nouvelles tables ou migrations : aucune nécessaire, tout est déjà en base.
- Refonte visuelle : on garde les mêmes composants (`KpiCard`, `BarChart`, `SettingsSection`).

## Découpage suggéré pour l'implémentation
1. Contexte de période + `useStatsQuery` (fondations).
2. Cantine + Transport (élimine tous les mocks visibles).
3. Vue d'ensemble + Comparatif écoles (KPIs cohérents).
4. Présences + Examens (filtre période + réussite).
5. Rapports & exports (le plus gros lot, PDF/XLSX réels).
