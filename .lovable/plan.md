## Objectif

Corriger uniquement l'**affichage** des effectifs à travers l'application, sans toucher aux données ni à la logique de promotion `pre_inscrit → inscrit` (déclenchée automatiquement au 1er versement). Aujourd'hui, plusieurs écrans filtrent trop strictement et cachent les 227 pré-inscrits de l'année active.

## Règle métier confirmée

| Zone | Statuts affichés | Raison |
|---|---|---|
| Dashboards, Statistiques, Effectifs, Listes élèves, Recherche | `inscrit` **+** `pre_inscrit` | Ce sont de vrais élèves de l'école |
| Finances, Recouvrement, Relances, Créances | `inscrit` **+** `pre_inscrit` | Un pré-inscrit doit une scolarité |
| **Cartes scolaires, Bulletins, Diplômes, Attestations** | `inscrit` uniquement | Pas d'édition tant qu'aucun versement |
| **Cantine, Transport, Bibliothèque (abonnements/prêts)** | `inscrit` uniquement | Réservé aux élèves ayant payé |

## Plan d'implémentation

### Étape 1 — Créer un helper commun
Nouveau fichier `src/lib/eleveStatus.ts` avec deux constantes réutilisables :
- `STATUTS_ACTIFS = ['inscrit', 'pre_inscrit']` (élève réellement dans l'école)
- `STATUTS_PAYANTS = ['inscrit']` (a déjà payé au moins une tranche)

Ce fichier centralise la règle : toute future modification se fait à un seul endroit.

### Étape 2 — Corriger les écrans qui doivent compter les deux statuts

Remplacer `.eq("statut", "inscrit")` par `.in("statut", STATUTS_ACTIFS)` dans :

**Statistiques & Dashboards**
- `src/pages/statistiques/sections/GlobalDashboard.tsx` (compteur élèves + effectifs par classe)
- `src/pages/statistiques/sections/StudentsStats.tsx` (total, garçons, filles, par cycle, par classe)
- Autres sections `statistiques/sections/*` qui filtrent par statut

**Effectifs & Classes**
- `src/pages/classes/sections/ClassesEffectifs.tsx`
- `src/pages/classes/sections/ClassesDashboard.tsx`
- Toute vue « effectif » d'une classe

**Finances**
- Écrans de recouvrement, relances, créances, listes de payeurs dans `src/pages/finances/sections/*` et `src/pages/finances/useFinanceData.ts`

**Dashboard principal**
- `src/pages/Dashboard.tsx` (KPI élèves)

**Ajout d'un badge visuel** : dans les listes d'élèves (StudentsLayout, StudentDetailDrawer), afficher un petit badge orange « Pré-inscrit » à côté du nom pour les distinguer, sans les cacher.

### Étape 3 — Vérifier que les zones « payant seulement » filtrent bien sur `inscrit`

Confirmer/laisser `.eq("statut", "inscrit")` dans :
- `src/pages/cartes/*` (cartes scolaires)
- Génération de bulletins (`src/lib/generateBulletinPDF.ts`, sections examens)
- Attestations d'inscription (`src/lib/generateAttestationInscriptionPDF.ts`)
- `src/pages/cantine/sections/CanteenSubscribers.tsx` (abonnés cantine)
- `src/pages/transport/sections/*` (abonnements transport)
- `src/pages/bibliotheque/sections/LibraryReaders.tsx` + `LibraryLoans.tsx` (lecteurs et prêts)

### Étape 4 — Nettoyer la page fictive résiduelle

`src/pages/Eleves.tsx` contient encore un tableau **codé en dur** (Diallo, Traoré…). Cette page racine n'est plus utilisée (le vrai module est `src/pages/eleves/StudentsLayout.tsx`) : supprimer le fichier ou le remplacer par une redirection vers `/eleves/tableau`.

### Étape 5 — Vérification

Après modifications :
1. Recharger `/statistiques` → doit afficher **227** élèves (au lieu de 0)
2. Recharger `/classes/effectifs` → chaque classe montre le vrai effectif
3. Recharger `/finances/recouvrement` → les 227 apparaissent dans les créances
4. Vérifier `/cartes` et `/bulletins` → **0** élève affiché (normal : aucun paiement encore)
5. Vérifier `/cantine/abonnes`, `/transport`, `/bibliotheque/lecteurs` → **0** (normal)

## Ce qui n'est PAS touché

- ❌ Aucune donnée modifiée en base
- ❌ Aucun changement sur `check_and_promote_eleve` ni les triggers
- ❌ Aucun changement sur le passage de classe
- ❌ Le statut `pre_inscrit` reste tel quel

Dès qu'un pré-inscrit fera son 1er versement, il basculera automatiquement en `inscrit` et apparaîtra alors dans les cartes, bulletins, cantine, etc. — sans intervention manuelle.

## Détails techniques

- **Fichiers modifiés estimés** : ~15 fichiers (surtout des remplacements 1-ligne `.eq → .in`)
- **Nouveau fichier** : `src/lib/eleveStatus.ts` (~10 lignes)
- **Fichier supprimé** : `src/pages/Eleves.tsx` (page fictive obsolète)
- **Aucune migration SQL**, aucun changement de schéma
- **Aucun impact RLS** ni sécurité
