# Plan — Scolarité auto, Grille Cantine/Car, Paiements & Bons

## 1. Scolarité : appliquer la grille modifiée aux élèves existants

**Problème actuel :** `regenerer_tranches_pre_inscrits` ne touche que les élèves au statut `pre_inscrit` **sans aucun paiement**. Résultat : dès qu'un élève est `inscrit` ou a payé une seule tranche, il conserve son ancien montant même si la grille change.

**Solution :**
- Nouvelle fonction SQL `recalculer_grille_ecole(ecole_id, annee_id, force boolean)` :
  - Boucle sur tous les élèves de l'année, appelle `generer_tranches_eleve(id, _force_recalc := true)`.
  - `_force_recalc = true` recalcule le montant même sur tranches déjà partiellement payées **uniquement si `paye < nouveau_montant`** (jamais en dessous du déjà payé) — sécurise contre remboursement fantôme.
  - Retourne `{ eleves_traites, tranches_modifiees }`.
- Trigger `AFTER UPDATE` sur `grille_tarifs_niveaux` : enqueue un flag (pas d'exécution auto pour éviter les surprises).
- Dans `GrilleTarifaireSection.tsx` : renommer le bouton en **« Appliquer aux élèves de la classe »** avec un `AlertDialog` clair :
  - Option 1 : « Pré-inscrits uniquement (sans paiement) » — comportement actuel.
  - Option 2 : « **Tous les élèves de ce niveau** » — nouveau, appelle `recalculer_grille_ecole`.
  - Message : « Les paiements déjà encaissés ne sont jamais annulés. Seul le montant restant est ajusté. »

## 2. Grille tarifaire Cantine & Car — CRUD complet

**État actuel :** Grille en dur dans `useFinanceSettings` (3 colonnes T1/T2/T3, lignes non modifiables).

**Nouveau schéma :**

```sql
CREATE TABLE public.grille_tarifs_services (
  id uuid PK,
  ecole_id uuid, annee_id uuid,
  service_type text CHECK IN ('cantine','transport'),
  libelle text,                 -- ex: "Cantine Maternelle", "Car zone A"
  periodicite text CHECK IN ('mensuel','trimestriel'),
  tranches jsonb,               -- [{numero, label, mois, jour, montant}]
  montant_total numeric GENERATED,
  actif boolean DEFAULT true
);
-- + GRANT + RLS ecole scope + trigger total
```

**UI :** Remplacer la carte statique `Grille tarifaire — Car & Cantine` par un composant `GrilleServicesSection` calqué sur `GrilleTarifaireSection` : table avec badges, boutons Ajouter/Modifier/Supprimer, dialog `GrilleServiceEditor` (libellé + périodicité + tranches libres).

## 3. Module Cantine/Car — paiements & bons de réduction

**Nouvelles tables :**

```sql
-- Échéances générées pour chaque abonné
CREATE TABLE public.echeances_services (
  id, ecole_id, eleve_id, service_type,
  grille_id → grille_tarifs_services,
  numero, label, echeance date, montant, paye numeric DEFAULT 0,
  statut CHECK IN ('due','partielle','payee','retard'),
  remise_id uuid NULL
);

-- Paiements
CREATE TABLE public.paiements_services (
  id, ecole_id, eleve_id, echeance_id, montant,
  mode paiement_mode, reference, recu_par, motif, created_at
);

-- Bons de réduction
CREATE TABLE public.bons_reduction (
  id, ecole_id, code text UNIQUE,
  libelle text, type CHECK IN ('montant','pourcent'),
  valeur numeric,                 -- FCFA si montant, % si pourcent
  service_types text[],           -- ['cantine'] / ['transport'] / both
  date_debut date, date_fin date,
  usage_max int NULL, usage_count int DEFAULT 0,
  actif boolean
);

CREATE TABLE public.bons_reduction_utilisations (
  id, bon_id, eleve_id, echeance_id, montant_applique, applique_par, created_at
);
```

**Fonctions RPC :**
- `generer_echeances_service(eleve_id, service_type)` : lit la grille active, crée les échéances.
- `enregistrer_paiement_service(echeance_id, montant, mode, ref, motif)` : sécurisée admin/comptable, met à jour paye/statut.
- `appliquer_bon_reduction(bon_id, echeance_id)` : vérifie validité + plafond, calcule le montant, crée la ligne d'utilisation, met à jour le paye de l'échéance (mode `remise`).

**UI (Cantine & Transport) :**
- Section **« Abonnés »** enrichie : liste avec colonnes Payé/Dû/Reste/Statut (comme Finances).
- Bouton **« Enregistrer un paiement »** → dialog similaire à `PaymentDialog` finances : choix échéance (mois ou trimestre selon périodicité), montant, mode, référence, bouton **« Appliquer un bon »** ouvrant un sélecteur des bons actifs applicables.
- Nouvelle sous-section **« Bons de réduction »** dans la configuration de chaque module :
  - CRUD complet (créer/modifier/désactiver, jamais supprimer si utilisé).
  - Affichage des utilisations passées.

## Fichiers principaux touchés

- `supabase/migrations/…_grille_services_paiements_bons.sql`
- `supabase/migrations/…_recalcul_grille_ecole.sql`
- `src/hooks/useGrilleServices.ts` (nouveau)
- `src/hooks/useEcheancesServices.ts` (nouveau)
- `src/hooks/useBonsReduction.ts` (nouveau)
- `src/pages/finances/components/GrilleTarifaireSection.tsx` (ajout options recalcul)
- `src/pages/finances/components/GrilleServicesSection.tsx` (nouveau)
- `src/pages/finances/components/GrilleServiceEditor.tsx` (nouveau)
- `src/pages/cantine/sections/CanteenBilling.tsx` (refonte)
- `src/pages/cantine/sections/CanteenSubscribers.tsx` (ajout colonnes paiement)
- `src/pages/cantine/sections/CanteenConfig.tsx` (ajout bons)
- `src/pages/transport/sections/…` équivalents
- `src/pages/finances/components/ServicePaymentDialog.tsx` (nouveau, mutualisé)
- `src/pages/finances/components/BonReductionDialog.tsx` (nouveau)
- `src/pages/finances/components/BonsReductionSection.tsx` (nouveau, réutilisable)

## Détails techniques

- Toutes les nouvelles tables suivent la règle `GRANT` + RLS scoping par `ecole_id` via `private.has_ecole_role`.
- Les fonctions RPC sont `SECURITY DEFINER` limitées à `admin`/`comptable`/`directeur`.
- Aucun statut n'est régressé : le recalcul scolarité ne baisse jamais `paye`, ne repasse pas une tranche `payee` à `due`.
- Bons : validation côté DB (dates, plafond, service, ecole_id) + côté UI.
- Devise FCFA partout, formatage via `fcfa()` existant.
- Les paiements services ne touchent PAS les tables `paiements`/`tranches` scolarité — modules séparés.

## Livraison en 2 phases

**Phase A (ce tour)** : migrations DB + hooks + recalcul scolarité (fix immédiat du bug remonté).

**Phase B (tour suivant)** : refonte UI Cantine/Transport (billing, bons, dialogs) — beaucoup de composants, mieux séparé pour rester lisible et testable.

Confirme si tu valides ce plan, ou dis-moi ce que tu veux ajuster (nommage des bons, périodicité obligatoire, etc.).
