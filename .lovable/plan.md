# Grille tarifaire scolarité — CRUD + automatisation

## Objectif
Remplacer la grille statique du fichier `scolarite-data.ts` par une grille **éditable en base** par niveau, avec gestion des nouveaux/anciens de la Grande Section, application automatique aux élèves non encore inscrits, et reconduction au passage à une nouvelle année.

---

## 1. Base de données (migration)

**Nouvelle table `grille_tarifs_niveaux`**
- `ecole_id`, `annee_id`
- `niveau_code` (ex: `MAT1`, `MAT2`, `GS`, `CP`, `CE`, `CM`, `COL_65`, `COL_4`, `COL_3`)
- `variant` (`null` par défaut, ou `ancien` / `nouveau` pour la GS)
- `libelle` (ex: "Grande Section — Nouveau")
- `tranches` (JSONB : `[{numero, label, mois, jour, montant}, …]` — nombre de tranches libre)
- `montant_total` (recalculé automatiquement = somme des tranches)
- Unicité : `(ecole_id, annee_id, niveau_code, variant)`
- RLS + GRANTs identiques au reste du module finances (admin/comptable)

**Ajout sur `eleves`**
- `est_nouveau` (booléen, défaut `false`) — coché pour les élèves de GS en première inscription, sert à choisir le variant tarifaire.

**Fonctions SQL (security definer)**
- `resoudre_niveau_code(classe_nom text) → text` : mappe le nom de classe au code niveau.
- `generer_tranches_eleve(_eleve_id)` réécrite : cherche d'abord dans `grille_tarifs_niveaux` (avec variant selon `est_nouveau` pour la GS), retombe sur `frais_scolarite` si absent.
- `regenerer_tranches_pre_inscrits(_ecole_id, _annee_id)` : pour chaque élève au statut `pre_inscrit` **sans aucun paiement**, supprime les tranches et régénère depuis la grille courante.
- `dupliquer_grille_annee(_ecole_id, _annee_source, _annee_cible)` : copie toutes les lignes de grille d'une année à l'autre.

**Seed** : insertion de la grille actuelle (la table visible dans la capture) pour l'année académique en cours du Groupe Scolaire La Providence.

---

## 2. Interface — page Configuration finances

Remplacement de la table statique « Grille tarifaire — Scolarité » par un **éditeur CRUD** :
- Ligne par niveau (avec badge Ancien/Nouveau pour la GS)
- Boutons **+ Niveau**, **Modifier**, **Supprimer**
- Dialog d'édition d'un niveau :
  - Libellé, nb de tranches (1 à 6), pour chaque tranche : libellé / mois / montant
  - Total recalculé en direct
  - Toggle « créer la variante Ancien/Nouveau » disponible uniquement pour la GS
- Au **Enregistrer** : upsert + appel automatique de `regenerer_tranches_pre_inscrits` (avec confirmation et compte d'élèves impactés).
- Bannière d'info : « X élèves pré-inscrits ont vu leurs tranches mises à jour. Les élèves déjà inscrits avec paiements en cours ne sont pas touchés. »

## 3. Fiche élève

Ajout d'une case à cocher **« Nouvel élève (1ère inscription en GS) »** dans le formulaire d'inscription / édition d'un élève. Affichée uniquement si la classe est en Grande Section. Le tarif appliqué (ancien/nouveau) suit automatiquement ce champ.

## 4. Nouvelle année académique

Lors de la création d'une nouvelle année dans **Écoles → Années scolaires** :
- Si une année précédente existe avec une grille, dialog modal :
  > « Reconduire la grille tarifaire de l'année 2025-2026 ? »
  > [Reconduire à l'identique] [Modifier après création] [Ne pas reconduire]
- Si « Reconduire » : appel de `dupliquer_grille_annee` puis redirection vers la page de configuration de la grille pour l'année cible (en lecture seule modifiable).

---

## 5. Compatibilité

- L'ancienne table `frais_scolarite` (par cycle) reste en place comme **fallback** pour ne pas casser les paiements en cours.
- Les élèves déjà inscrits avec au moins un paiement ne sont **jamais** régénérés : leurs tranches existantes restent intactes.
- Le fichier `scolarite-data.ts` (constantes UI) garde son rôle d'affichage de démo, mais la page Configuration affichera dorénavant les valeurs réelles de la base.

---

## Détails techniques

```
grille_tarifs_niveaux
├─ ecole_id            uuid    FK ecoles
├─ annee_id            uuid    FK annees_scolaires
├─ niveau_code         text    MAT1|MAT2|GS|CP|CE|CM|COL_65|COL_4|COL_3
├─ variant             text    null | 'ancien' | 'nouveau'
├─ libelle             text
├─ tranches            jsonb   [{numero:int, label:text, mois:int, jour:int, montant:numeric}]
├─ montant_total       numeric (calculé via trigger)
└─ UNIQUE(ecole_id, annee_id, niveau_code, variant)
```

Le trigger existant `frais_generer_tranches` n'est pas touché ; un nouveau trigger sur `grille_tarifs_niveaux` régénère automatiquement les tranches des pré-inscrits du niveau concerné après chaque insert/update/delete.

Implémentation estimée : 1 migration SQL + 4 fichiers TSX modifiés/créés.
