## Objectif
1. Saisir les notes du test d'entrée par candidat (FR + MATH pour 6ème/5ème ; FR + MATH + ANG pour les autres), avec calcul automatique de la moyenne et mise à jour automatique du statut (`admis` si moyenne ≥ 10/20, sinon `refuse`).
2. Ajouter l'impression de la liste des candidats **par classe demandée** et **par statut** depuis l'écran "Tests d'entrée" (CSV/Excel/PDF, groupée par classe ou par statut).

## Base de données (migration)
Ajout de colonnes à `sp_candidats` (pas de table séparée — 1 ligne = 1 candidat, 1 test) :
- `note_francais numeric(4,2)` (0–20, nullable)
- `note_maths numeric(4,2)` (0–20, nullable)
- `note_anglais numeric(4,2)` (0–20, nullable, utilisée seulement hors 6ème/5ème)
- `moyenne_test numeric(4,2)` (calculée par trigger)

Trigger `trg_sp_candidats_calc_moyenne` (BEFORE INSERT/UPDATE) :
- Détecte les classes 6ème/5ème via `lower(classe_demandee) ~ '^(6|5)\s*[eè]me'` (fallback si `classe_demandee_id` : lookup `classes.nom`).
- 6ème/5ème : moyenne = (FR + MATH) / 2 si les 2 saisies.
- Autres : moyenne = (FR + MATH + ANG) / 3 si les 3 saisies.
- Si toutes les notes requises sont présentes ET statut actuel ∈ {`programme`,`present`,`en_attente`} → passe automatiquement à `admis` (moyenne ≥ 10) ou `refuse` (< 10).
- Si une note requise est retirée → statut redevient `present` (pour permettre correction).
- Ne touche pas au statut si l'admin l'a forcé manuellement à `absent`.

Contraintes CHECK : chaque note entre 0 et 20.

## Frontend

### Dialog de saisie des notes
Nouveau `src/pages/services-ponctuels/components/CandidatNotesDialog.tsx` :
- Reçoit le candidat + sa classe demandée.
- Affiche 2 champs (FR/MATH) pour 6ème/5ème, 3 champs (FR/MATH/ANG) sinon.
- Aperçu temps réel de la moyenne et du statut prévu (badge Admis/Refusé).
- Bouton Enregistrer → `update` sur `sp_candidats` (le trigger recalcule).

### Bouton "Notes" dans la liste
Modifier `SpTestsEntree.tsx` :
- Nouvelle icône (📝 `ClipboardCheck`) entre "Convertir" et "Éditer" ouvrant le dialog.
- Colonne "Moyenne" (affichée uniquement si valeur présente) à côté du statut.

### Impression listes
Dans `SpTestsEntree.tsx` header, remplacer le bouton d'export existant (ou l'étendre) par un menu déroulant "Imprimer" :
- **Par classe demandée** — groupement PDF via `pdfGroupBy: 'classe_demandee'` (déjà supporté dans `exporters.ts`), colonnes : N°, Candidat, Sexe, Parent/Tél, Date test, Notes, Moyenne, Statut.
- **Par statut** — même liste groupée par `statut` (libellés FR).
- 3 formats : CSV, Excel, PDF (via `ReportExportButtons` réutilisable).
- Filtres pré-appliqués : recherche courante + option "Session en cours".

## Détails techniques

```text
Flux saisie note
────────────────
UI Dialog → update sp_candidats {note_fr, note_maths, note_anglais}
              │
              ▼
      Trigger BEFORE UPDATE
              │
     ┌────────┴─────────┐
     ▼                  ▼
 Calcule moyenne   Ajuste statut (admis/refuse)
```

Fichiers touchés :
- migration SQL (colonnes + trigger + check)
- `src/pages/services-ponctuels/hooks/useSpCandidats.ts` (ajouter `updateNotes`)
- `src/pages/services-ponctuels/components/CandidatNotesDialog.tsx` (nouveau)
- `src/pages/services-ponctuels/sections/SpTestsEntree.tsx` (bouton Notes + menu Imprimer + colonne Moyenne)

Aucun impact sur les modules paiement/reçus.
