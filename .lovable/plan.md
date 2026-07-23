## Bugs identifiés

### 1. Classes dupliquées dans le wizard "Vente de tenue" (étape 1)
`useClasses()` est appelé sans `anneeId` dans `VenteTenueDialog.tsx` → il charge les classes de **toutes les années scolaires** (34 lignes = 17 classes × 2 années). L'utilisateur voit donc chaque classe 2 fois (`CP1`, `CP1`, `CE1`, `CE1`…).

### 2. Aucun élève à l'étape 2
Conséquence directe du bug 1 : si l'utilisateur choisit la classe de la **mauvaise année** (celle sans élèves inscrits), le filtre `e.classe_id === classeId` renvoie 0 élève. Le hook `useEleves()` retourne, lui, les élèves de l'année active uniquement.

### 3. Paiements de tenue via "Nouveau paiement" absents du Point de caisse
Dans `SpPointCaisse.tsx`, un paiement de `sp_paiements` est typé `"test"` si le service est `test_entree`, sinon `"service"`. L'onglet **"Ventes de tenues"** n'affiche que `lignesVentes` (table `sp_ventes_tenues`) → les paiements créés depuis l'écran générique "Paiements" (qui écrivent dans `sp_paiements` avec le service *Tenue scolaire*) n'apparaissent pas dans cet onglet, ni dans la ventilation "par catégorie" comme *Ventes de tenues*.

### 4. Gestion du stock de tenues (risque de négatif + double décrément)
Deux triggers coexistent sur `sp_ventes_tenues` :
- `trg_sp_apply_stock_tenue_classe` → décrémente `sp_stock_tenues` (par classe/genre) avec `GREATEST(0, …)` ✅
- `trg_sp_ventes_stock` → décrémente `sp_services.stock_actuel` (global) **sans garde-fou** → peut devenir négatif.

De plus, les stocks sont enregistrés par `classe_id`, or chaque classe existe en double (une par année scolaire). Le stock est donc fragmenté entre années : une classe CP1 réapprovisionnée sur l'année N-1 n'apparaît pas sur l'année N.

Enfin, il n'existe pas de **contrôle explicite** avant INSERT ni de **journal d'inventaire** (mouvements entrée/sortie).

---

## Plan de correction

### A. VenteTenueDialog — classes & élèves (bugs 1 & 2)
`src/pages/services-ponctuels/components/VenteTenueDialog.tsx`
- Récupérer l'année scolaire active via `useAnneeActive()` (déjà utilisé ailleurs) et passer son `id` à `useClasses(anneeActiveId)`.
- Fallback : dédupliquer par `nom` si aucune année active n'est trouvée.

### B. Point de caisse — inclure les paiements "Tenue scolaire" (bug 3)
`src/pages/services-ponctuels/sections/SpPointCaisse.tsx`
- Ajouter détection : si `service.slug === "tenue"` (ou `service.gere_stock === true`), typer la ligne comme `"tenue"` au lieu de `"service"`.
- L'onglet **Ventes de tenues** inclura alors à la fois `sp_ventes_tenues` et les `sp_paiements` liés au service Tenue.
- La ventilation "par catégorie" les regroupera automatiquement sous *Ventes de tenues*.

### C. Stock — supprimer le double décrément et empêcher les négatifs (bug 4)
Migration SQL :
1. **Supprimer** le trigger `trg_sp_ventes_stock` et la fonction `sp_ventes_stock_trigger` (redondant avec `sp_apply_stock_tenue_classe` et fragile car agit sur `sp_services.stock_actuel` global).
2. **Renforcer** `sp_apply_stock_tenue_classe` :
   - Refuser (`RAISE EXCEPTION`) si la vente passe à `paye`/`remis` alors que `stock_actuel < quantite` — sauf si `statut = reservation` (contournement explicite).
   - Garder `GREATEST(0, …)` en filet de sécurité.
3. **Créer** un mini-journal d'inventaire `sp_stock_tenues_mouvements` (date, classe_id, genre, type IN `entree|sortie|ajustement|annulation`, quantite, motif, vente_id nullable, user_id) alimenté par trigger sur `sp_stock_tenues` (UPDATE) et sur `sp_ventes_tenues` (retrait/annulation). GRANT + RLS `authenticated` même école.
4. Vue `sp_stock_tenues_view` synthétique (stock actuel, ventes du mois, seuil, statut) — optionnel, pour l'écran d'inventaire.

### D. UI Inventaire (optionnel, court)
`src/pages/services-ponctuels/sections/SpStockTenuesConfig.tsx` : afficher un lien "Voir les mouvements" ouvrant la liste (`sp_stock_tenues_mouvements`) filtrable par classe/genre/période, avec export CSV/Excel/PDF via `ReportExportButtons` existant.

---

## Résumé des changements

```text
Frontend :
  src/pages/services-ponctuels/components/VenteTenueDialog.tsx   (filtrer par année active)
  src/pages/services-ponctuels/sections/SpPointCaisse.tsx        (tenue via sp_paiements)
  [option D] src/pages/services-ponctuels/sections/SpStockTenuesConfig.tsx

Base de données (1 migration) :
  - DROP TRIGGER trg_sp_ventes_stock + DROP FUNCTION sp_ventes_stock_trigger
  - RECREATE sp_apply_stock_tenue_classe (garde-fou + exception si rupture non-réservation)
  - CREATE TABLE sp_stock_tenues_mouvements + GRANT + RLS + triggers alimentation
```

Confirme-moi si tu veux inclure l'écran D (journal d'inventaire) ou seulement A + B + C dans ce lot.