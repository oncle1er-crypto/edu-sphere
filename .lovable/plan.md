# Module « Classes & Niveaux » — Audit fonctionnel

Sur la base de l'inspection du module (10 sections, ~1600 lignes, hooks `useClasses`/`useCycles`/`useSalles`/`useEmploiDuTemps`, table `passages_classe`, audit_logs pour transferts) :

## Module ≈ 90 % fonctionnel

| Section | État | Détail |
|---|---|---|
| Tableau de bord | ✅ 95 % | KPIs classes/effectifs/cycles |
| Toutes les classes (liste) | ✅ 100 % | CRUD complet, prof principal, salle, capacité |
| Cycles & niveaux | ✅ 95 % | CRUD cycles opérationnel |
| Effectifs & remplissage | ✅ 95 % | Progression + bouton « Appliquer scolarité » |
| Groupes pédagogiques | ✅ 90 % | CRUD groupes + membres |
| Salles de classe | 🟡 70 % | Vue agrégée en lecture seule — pas de CRUD dédié (renvoie vers la liste des classes) |
| Emploi du temps | 🟡 75 % | Lecture hebdo par classe uniquement — pas de création/édition ici (renvoie au module Emploi du temps) |
| Transferts & passages | 🟡 80 % | Transfert manuel opérationnel + journal, mais pas d'historique unifié `passages_classe`, pas d'annulation, pas de transferts en masse |
| Rapports | ✅ 85 % | Rapports PDF classes/effectifs |
| Configuration | ✅ 90 % | Paramètres classes (`parametres_classes`) |

## Points restants pour atteindre 100 %

1. **Salles** : passer d'une vue agrégée en lecture seule à un vrai CRUD (créer/modifier/supprimer une salle indépendamment d'une classe, gérer bâtiment/étage/équipements — la table `salles` existe déjà avec 13 colonnes mais n'est pas exploitée dans cette section).
2. **Emploi du temps de classe** : ajouter une action d'édition rapide d'un créneau depuis cette vue (aujourd'hui purement lecture, redirige vers le module Emploi du temps).
3. **Transferts** :
   - unifier historique en lisant aussi `passages_classe` (mouvements inter-années) en plus de `audit_logs`,
   - permettre l'**annulation** d'un transfert (retour à la classe d'origine avec traçabilité),
   - ajouter un **transfert en masse** (sélection multi-élèves d'une classe vers une autre),
   - contrôles anti-erreurs : bloquer si la classe destination dépasse sa capacité (avec bypass admin).
4. **Effectifs** : ajouter répartition **filles/garçons** par classe et alerte visuelle sur les classes en sur-effectif (>100 %) ou sous-effectif (<50 %).
5. **Verrouillage année** : empêcher la modification/transfert sur une année scolaire clôturée (aujourd'hui aucun verrou côté DB pour `classes`/`eleves.classe_id`).

## Plan d'exécution proposé (4 vagues)

### Vague 1 — Salles CRUD complet
- Nouveau composant `SallesDialog` (créer/éditer une salle via table `salles`).
- Réécriture de `ClassesRooms.tsx` : liste des salles avec bâtiment, étage, capacité, équipements, classes rattachées, actions éditer/supprimer.
- Assignation d'une salle à une classe via `salle_id` (au lieu du texte libre `salle`).

### Vague 2 — Effectifs enrichis
- Ajout colonnes **F / G** dans `ClassesEffectifs.tsx` (agrégation depuis `eleves.sexe`).
- Badge d'alerte capacité (rouge > 100 %, ambre > 90 %, gris < 50 %).
- Rapport PDF « Effectifs détaillés par sexe » ajouté à `ClassesReports.tsx`.

### Vague 3 — Transferts robustes
- Fusion `audit_logs (transfert_classe)` + `passages_classe` dans la liste (avec filtre par année).
- Bouton **Annuler** sur chaque transfert récent (< 30 jours) → repositionne l'élève + entrée audit.
- Dialog **Transfert en masse** : sélection classe source → multi-select élèves → classe destination + motif.
- Contrôle de capacité côté RPC.

### Vague 4 — Verrouillage & finitions
- Trigger DB `trg_classes_annee_verrouillee` bloquant UPDATE/DELETE sur `classes` et `eleves.classe_id` quand `annees_scolaires.statut = 'cloturee'` (bypass admin).
- Édition rapide de créneau depuis `ClassesSchedule.tsx` (petit dialog `CreneauQuickEdit`).
- Bannière d'information sur le verrouillage dans le Tableau de bord.

## Détails techniques

- Table `salles` : déjà présente (13 colonnes, 2 policies) — à câbler.
- Table `passages_classe` : 13 colonnes, historique inter-années — à croiser dans Transferts.
- Nouvelle RPC `transferer_eleve(eleve_id, classe_dest_id, motif)` : effectue update + insert `passages_classe` + audit + contrôle capacité.
- Nouvelle RPC `annuler_transfert(audit_log_id)` : lit `details.eleve_id` + `details.de` et rétablit.
- Nouvelle RPC `transferer_masse(eleve_ids[], classe_dest_id, motif)` : boucle transactionnelle.
- Trigger verrouillage : fonction `est_annee_cloturee(annee_id)` + trigger BEFORE UPDATE/DELETE.

Confirmez « Go » et l'ordre souhaité (les 4 vagues d'un coup, ou vague par vague pour tester entre chaque).
