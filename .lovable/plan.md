
## Objectif
Rendre la page **Finances → Reçus & quittances** vraiment exploitable au quotidien : retrouver un paiement en 2 secondes, comprendre d'un coup d'œil ce qui a été encaissé, et exporter/agir en masse.

Aujourd'hui la page charge les 300 derniers paiements, sans recherche, sans filtre, sans tri, sans total dynamique. Dès qu'il y a plusieurs semaines d'activité, on ne retrouve plus rien.

---

## Ce qui va être ajouté

### 1. Bandeau KPI en tête (mis à jour selon les filtres)
- **Total encaissé** sur la sélection
- **Nombre de reçus**
- **Ticket moyen**
- **Nombre d'élèves distincts**
- **Nombre de jours couverts**

### 2. Barre de recherche & filtres (sticky)
- **Recherche libre** instantanée : nom, prénom, matricule, référence, classe
- **Plage de dates** (du / au) avec raccourcis : *Aujourd'hui · 7 derniers jours · Ce mois · Mois précédent · Année active*
- **Mode de paiement** (multi-sélection : Espèces, Wave, Orange Money, Chèque, Virement…)
- **Classe** (multi-sélection alimentée depuis la BD)
- **Tranche** (T1, T2, T3, Inscription…)
- **Fourchette de montant** (min / max)
- Bouton **Réinitialiser les filtres** + compteur "X filtres actifs"

### 3. Tri par colonne
En-têtes cliquables (flèche ↑/↓) sur : **Date**, **Montant**, **Élève**, **Classe**, **Mode**, **Tranche**, **Référence**. Tri stable, avec indicateur visuel.

### 4. Chargement sans limite artificielle
- Remplacement du `.limit(300)` par une **pagination** (50 par page) ou un **chargement incrémental** ("Charger 50 de plus"), pour couvrir toute l'année active sans figer la page.
- Les KPIs et le total ligne du bas se calculent côté serveur sur l'ensemble filtré, pas seulement sur la page visible.

### 5. Lisibilité de la liste
- **Badge coloré** par mode de paiement (cohérent avec la charte)
- **Avatar / initiales** de l'élève à côté du nom
- **Ligne cliquable** → ouvre le drawer élève existant (`StudentDetailDrawer`) pour voir tout son historique de paiement et sa scolarité
- **Ligne de pied de tableau** qui affiche `Total filtré` et `Nombre de reçus`
- En-tête de tableau **sticky** lors du scroll

### 6. Actions groupées
- Case à cocher par ligne + case "tout sélectionner sur la page"
- Actions sur la sélection :
  - **Télécharger les reçus** (ZIP de PDFs)
  - **Fusionner en un seul PDF** (extension du bouton "Fusionner" actuel à une sélection libre, pas seulement même élève+jour)
  - **Exporter en CSV / Excel** la liste filtrée (utile pour la comptabilité et les audits)

### 7. Petits plus UX
- Vue **Détaillé / Groupé** conservée, mais les filtres s'appliquent aux deux
- Persistance des filtres dans l'URL (partageable, retour arrière ne perd pas la sélection)
- Message vide plus utile : "Aucun résultat pour ces filtres — [Réinitialiser]"

---

## Aperçu visuel (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Total encaissé   Reçus     Ticket moyen   Élèves    Jours            │
│  2 145 000 F      49        43 776 F       38        3                │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ 🔍 Rechercher élève, référence, matricule…    [Aujourd'hui ▾] [Mode ▾]│
│ [Classe ▾]  [Tranche ▾]  [Montant min–max]    3 filtres · Réinitialiser│
└────────────────────────────────────────────────────────────────────────┘
┌ Détaillé │ Groupé (élève+jour) │ Groupé (élève+jour+tranche) ┐
│ ☐  Réf ↕  Élève ↕        Classe ↕  Tranche ↕  Mode ↕  Montant↓ Date ↕│
│ ☐  A7F2  👤 KOFFI Awa    CE1       T2         Wave    75 000   12/07 │
│ ☐  B31C  👤 DIALLO Sara  6ème A    T1         Espèces 120 000  12/07 │
│ …                                                                      │
│                                        Total filtré : 2 145 000 F     │
│                       [Charger 50 de plus]   [Export CSV] [ZIP PDFs]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Détails techniques
- **Fichier principal** : `src/pages/finances/sections/Receipts.tsx` (refactor en découpant en sous-composants : `ReceiptsFilters`, `ReceiptsKpis`, `ReceiptsTable`, `ReceiptsBulkBar`).
- Requêtes Supabase paginées (`.range(from, to)`), avec un `count: "exact"` séparé pour les KPIs (`sum`, `count(distinct eleve_id)`) via une petite RPC ou des agrégations côté client sur la page en cours + un endpoint dédié pour les totaux.
- Recherche : `.or("eleves.nom.ilike.%q%, eleves.prenom.ilike.%q%, eleves.matricule.ilike.%q%, reference.ilike.%q%")`, debounce 250 ms.
- Tri : paramètre `.order(col, { ascending })` piloté par l'état local.
- ZIP : `jszip` (déjà indirectement compatible avec l'app) pour le paquet de PDFs.
- CSV : sérialisation en clair, séparateur `;` (compatible Excel FR).
- URL sync via `useSearchParams`.
- Aucune modification de schéma BD nécessaire (indices existants sur `paiements(ecole_id, date_paiement)` suffisent ; on pourra ajouter un index sur `paiements(reference)` si la recherche par référence devient lente).

---

## Hors périmètre (à confirmer si souhaité)
- Impression thermique / imprimante ticket
- Reçus annulés / avoirs (aujourd'hui on peut seulement changer le mode)
- Rapprochement bancaire (import relevé Wave / Orange Money)
