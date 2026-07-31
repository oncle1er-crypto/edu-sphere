# Filtrage global par niveau (Maternelle / Primaire / Secondaire / Global)

Objectif : un sélecteur de niveau dans l'en-tête qui filtre les données de tous les modules, sauf Communication et Paramètres. Option « Tous les niveaux » (global) disponible.

## Ce que verra l'utilisateur

- Dans l'en-tête, à côté de l'année scolaire : un sélecteur **Niveau** avec 4 choix — Tous les niveaux, Maternelle, Primaire, Secondaire (basé sur les cycles existants : Maternelle 6 classes, Primaire 12, Secondaire 16).
- Le choix est mémorisé (localStorage) et conservé d'une page à l'autre.
- Dès qu'un niveau est choisi, listes, compteurs, tableaux de bord, rapports et PDF ne contiennent que les données de ce niveau ; les intitulés de rapports mentionnent le niveau.
- Un utilisateur restreint à un niveau (ex. directeur du primaire) voit le sélecteur verrouillé sur son niveau, sans option globale.
- Communication et Paramètres restent inchangés (toujours tout l'établissement).

## Découpage du travail

### Lot 1 — Socle technique
- Contexte `NiveauContext` (cycle sélectionné, liste des cycles, mode global, helpers `filterByCycle`).
- Sélecteur `NiveauSwitcher` dans `AppHeader`.
- Hooks socles filtrés : `useClasses` (via `cycle_id`), `useEleves` (via la classe), `useHomeOverview`.

### Lot 2 — Rattachement des données hors classe
- Migration : ajout d'une colonne `cycle_id` (nullable, FK `cycles`) sur les tables non rattachées à une classe et pertinentes par niveau : `enseignants`, `matieres`, `salles`, `livres`, `lignes_transport`, `vehicules`, `chauffeurs`, `stocks_cantine`, `menus_cantine`, `cantine_personnel`, `depenses`, `lignes_budget`, `fournisseurs`, `groupes_pedagogiques`, `sp_services`, `bons_reduction`, `grille_tarifs_niveaux`, `grille_tarifs_services`.
- Écrans de saisie correspondants : champ « Niveau » (facultatif) ; les enregistrements sans niveau restent visibles en mode global et dans tous les niveaux, pour ne rien masquer par accident tant que les données ne sont pas qualifiées.
- Un écran Paramètres « Affectation des niveaux » pour qualifier en masse les enregistrements existants (sélection multiple → attribuer un niveau).

### Lot 3 — Filtrage module par module
Élèves, Classes & niveaux, Enseignants, Matières, Examens & notes, Présences, Vie scolaire, Finances (dont points de caisse et rapports), Cantine, Transport, Bibliothèque, Cartes & badges, Emploi du temps, Services ponctuels, Cours de vacances, Statistiques, Écoles.
Pour chaque module : filtrage des requêtes, des KPI et des exports (CSV/Excel/PDF), en réutilisant les helpers du Lot 1.

### Lot 4 — Restriction par utilisateur
- Migration : colonne `cycle_id` sur `profiles` (nullable = accès à tous les niveaux).
- Lecture dans `NiveauContext` : si renseignée, le niveau est forcé et l'option globale masquée.
- Écran Paramètres → Utilisateurs : attribution du niveau par utilisateur (réservé admin/directeur).
- Politiques RLS mises à jour pour les tables sensibles côté élèves/classes/finances, afin que la restriction ne soit pas seulement visuelle.

## Détails techniques

- Le niveau est un `cycles.id`. Le filtrage se fait :
  - direct quand `cycle_id` existe (`classes`, `frais_scolarite`, nouvelles colonnes) ;
  - par jointure sur la classe quand `classe_id` existe (`presences`, `evaluations`, `retards`, `incidents_discipline`, `creneaux_emploi_temps`, `bulletins_audit`…) ;
  - via `eleves.classe_id` pour les tables élèves (`paiements`, `factures`, `tranches`, `abonnements_*`, `documents_eleves`, `emprunts`, `notes`…).
- Pour éviter des jointures coûteuses côté client, `NiveauContext` expose la liste des `classe_id` et `eleve_id` du niveau actif (chargée une fois par école/année) et les hooks utilisent `.in(...)` par lots de 500 ids max.
- Les RPC agrégeants (points de caisse, récap journalier, `generer_factures_service`) reçoivent un paramètre `p_cycle_id` optionnel.
- Aucun changement sur Communication et Paramètres.

## Vérification
- Sélection d'un niveau puis contrôle des effectifs, du total encaissé et d'un PDF de rapport contre une requête SQL équivalente.
- Contrôle qu'un utilisateur restreint ne peut pas lire les données de l'autre niveau (test RLS).
