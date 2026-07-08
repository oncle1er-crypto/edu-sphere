## Lot 1.2 — Barèmes & Validation des examens

### Objectif
Rendre 100 % fonctionnels :
- `src/pages/examens/sections/GradingScales.tsx` : brancher sur `parametres_matieres` (règles d'évaluation par matière/niveau) au lieu des règles codées en dur.
- `src/pages/examens/sections/Validation.tsx` : brancher les boutons de verrouillage/signature sur `bulletins_audit` + RPC `verrouiller_bulletin` existante.

### Étapes

**1. Explorer l'existant (lecture seule)**
- Lire `GradingScales.tsx` et `Validation.tsx` en entier.
- Vérifier le schéma `parametres_matieres` et `bulletins_audit`, et confirmer que `verrouiller_bulletin` existe (fonction RPC).
- Vérifier s'il existe un hook `useParametresMatieres` — sinon en créer un.

**2. Migration (si nécessaire)**
- Ajouter uniquement les colonnes manquantes à `parametres_matieres` si le stockage des barèmes en a besoin (ex: `note_max`, `bareme_json`, `regles_arrondi`). Sinon, aucune migration.
- Aucun changement de schéma pour `bulletins_audit` : la table et la RPC existent.

**3. Hook barèmes**
- Créer `src/hooks/useGradingScales.ts` : `fetchScales(ecoleId)`, `saveScale(scaleId, patch)`, `resetToDefault()`.
- Filtrer par `ecole_id` + optionnellement `niveau` / `matiere_id`.

**4. GradingScales.tsx**
- Remplacer les 2 tableaux hardcodés par des données issues de `useGradingScales`.
- Formulaire d'édition d'un barème → `saveScale`.
- Bouton « Réinitialiser aux valeurs officielles MENA » (côte d'ivoirien) → `resetToDefault`.
- Skeleton + toasts succès/erreur.

**5. Validation.tsx**
- Charger via `useBulletinsAudit` (créer si absent) la liste des bulletins en attente de validation pour la période active.
- Boutons :
  - « Verrouiller » → RPC `verrouiller_bulletin(bulletin_id)`.
  - « Signer » → mise à jour `bulletins_audit.signature_directeur`.
  - « Ouvrir en override » → réutilise `BulletinOverrideDialog` déjà présent.
- Compteurs : brouillons / verrouillés / signés.

**6. Tests avant validation utilisateur**
- Compilation TS (auto via harness).
- Test manuel Playwright sur `/examens/grading-scales` : chargement, édition d'un barème, sauvegarde persistante après rechargement.
- Test manuel Playwright sur `/examens/validation` : affichage des bulletins, clic « Verrouiller », vérification que le badge change et que la ligne devient non-éditable.
- Capture d'écran des 2 pages, lecture des logs console.

### Fichiers touchés
- (peut-être) migration `parametres_matieres` — colonnes barème.
- **Nouveaux** : `src/hooks/useGradingScales.ts`, `src/hooks/useBulletinsAudit.ts` (si absent).
- **Modifiés** : `src/pages/examens/sections/GradingScales.tsx`, `src/pages/examens/sections/Validation.tsx`.

### Hors périmètre
- Réécriture de la génération PDF des bulletins.
- Notification automatique des parents après signature (sera fait dans un lot ultérieur).
- Refonte du dashboard examens.

Une fois le lot 1.2 validé par vos tests, on enchaîne sur le **lot 1.3 (Conseils de classe & Compositions)**.
