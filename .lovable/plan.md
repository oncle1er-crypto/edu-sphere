# Filtrage global par niveau (Primaire / Secondaire / Global)

Objectif : un sélecteur de niveau dans l'en-tête qui filtre les données de tous les modules, sauf Communication et Paramètres. Option « Tous les niveaux » (global) disponible.

## Ce que verra l'utilisateur

- Dans l'en-tête, à côté de l'année scolaire : un sélecteur **Niveau** avec 3 choix — Tous les niveaux, Primaire (Maternelle incluse), Secondaire. Sur l'année active 2026-2027 : Maternelle 3 classes + Primaire 6 classes = 9 classes pour le niveau Primaire, et Secondaire 8 classes. Le filtre niveau se combine toujours avec l'année scolaire active.
- Le choix est mémorisé (localStorage) et conservé d'une page à l'autre.
- Dès qu'un niveau est choisi, listes, compteurs, tableaux de bord, rapports et PDF ne contiennent que les données de ce niveau ; les intitulés de rapports mentionnent le niveau.
- Un utilisateur restreint à un niveau (ex. directeur du primaire) voit le sélecteur verrouillé sur son niveau, sans option globale.
- Communication et Paramètres restent inchangés (toujours tout l'établissement).
- En mode global, chaque saisie de dépense demande son niveau d'affectation : **Primaire**, **Secondaire** ou **Commun** (dépense partagée). En mode niveau, le niveau est pré-rempli et modifiable.


## Découpage du travail

### Lot 1 — Socle technique
- Contexte `NiveauContext` (cycle sélectionné, liste des cycles, mode global, helpers `filterByCycle`).
- Sélecteur `NiveauSwitcher` dans `AppHeader`.
- Hooks socles filtrés : `useClasses` (via `cycle_id`), `useEleves` (via la classe), `useHomeOverview`.

### Lot 2 — Rattachement des données hors classe
- Migration : ajout d'une colonne `cycle_id` (nullable, FK `cycles`) sur les tables non rattachées à une classe et pertinentes par niveau : `enseignants`, `matieres`, `salles`, `livres`, `lignes_transport`, `vehicules`, `chauffeurs`, `stocks_cantine`, `menus_cantine`, `cantine_personnel`, `depenses`, `lignes_budget`, `fournisseurs`, `groupes_pedagogiques`, `sp_services`, `bons_reduction`, `grille_tarifs_niveaux`, `grille_tarifs_services`.
- Écrans de saisie correspondants : champ « Niveau » avec les valeurs Primaire / Secondaire / Commun (`cycle_id` vide = Commun).
- Dépenses en particulier : le champ Niveau est obligatoire à la saisie (Primaire, Secondaire ou Commun) et modifiable ensuite, y compris en mode global.
- Un écran Paramètres « Affectation des niveaux » pour qualifier en masse les enregistrements existants (sélection multiple → attribuer un niveau ou Commun).

### Lot 2 bis — Cohérence comptable par niveau
- Règle unique appliquée partout : une écriture appartient soit à un niveau, soit au **Commun**. Aucune ligne n'est comptée deux fois.
- Vue niveau (Primaire ou Secondaire) : recettes du niveau, dépenses du niveau, plus la **quote-part** des dépenses communes. Clé de répartition par défaut : effectif élèves du niveau / effectif total (paramétrable dans Paramètres → Finances : effectif, recettes, ou 50/50). La quote-part est affichée sur une ligne distincte « Charges communes réparties », jamais fondue dans les dépenses propres.
- Vue globale : total = Primaire + Secondaire + Commun (montants bruts, sans clé de répartition). Contrôle automatique affiché : `Global = Primaire + Secondaire + Commun` et `somme des quote-parts = total des charges communes`.
- Solde de caisse : calculé uniquement sur les mouvements réels (encaissements et règlements), sans clé de répartition, avec une ventilation indicative par niveau et une ligne Commun. Le solde global reste la seule valeur de référence pour la trésorerie.
- Impacté : Grand livre (`Ledger.tsx`), Compte de résultat / bilan (`generateFinanceReports.ts`, `getCompteResultat`), Dépenses, Budget, Trésorerie, points de caisse (scolarité, cantine, transport, services ponctuels, cours de vacances).
- Chaque rapport et PDF porte l'entête « Niveau : Primaire / Secondaire / Tous » et, quand une clé est utilisée, la mention de la clé et du taux appliqué.


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
- Contrôles comptables systématiques : total global = Primaire + Secondaire + Commun ; somme des quote-parts communes = total des charges communes ; débit = crédit dans le grand livre ; solde de caisse identique avant/après activation du filtre.
- Contrôle qu'un utilisateur restreint ne peut pas lire les données de l'autre niveau (test RLS).

