## Constat
`src/pages/enseignants/sections/StaffSchedule.tsx` est intégralement statique : liste d'enseignants, semaine et créneaux sont codés en dur. Aucun lien avec la base.

Or les données existent déjà :
- table `enseignants` (nom, prénom, matière principale)
- table `creneaux_emploi_temps` (jour, heure_debut, heure_fin, classe_id, matiere_id, enseignant_id, salle_id/salle)
- table `remplacements` (pour signaler les créneaux couverts par un remplaçant)
- hook `useEnseignants` déjà utilisé ailleurs

## Objectif
Rendre l'onglet **Emploi du temps enseignant** 100% fonctionnel, aligné sur le module « Emploi du temps » existant.

## Plan d'implémentation

### 1. Sélecteur d'enseignant réel
- Charger la liste depuis `enseignants` filtrée sur `ecole_id` et année active
- Afficher `nom prénom — matière` (fallback : `nom prénom` si pas de matière principale)
- Trier alphabétiquement, recherche par saisie
- Présélectionner le premier enseignant de la liste

### 2. Navigation semaine
- Remplacer le badge statique par un vrai sélecteur `‹ Semaine du JJ/MM/AAAA ›`
- Boutons précédent / suivant / « aujourd'hui »
- Aucune requête liée à la date (les créneaux sont hebdomadaires récurrents), la date sert juste d'affichage et pour les remplacements ponctuels

### 3. Grille horaire dynamique
- Récupérer `creneaux_emploi_temps` filtrés par `ecole_id`, `annee_id` (année active) et `enseignant_id = sélectionné`
- Joindre `classes(nom)`, `matieres(nom, couleur)`, `salles(code)`
- Générer dynamiquement les lignes d'heures à partir de la config de l'école (`parametres_classes.plage_horaire_debut/fin` ou par défaut 08:00 → 17:00 par tranches d'1h)
- Colorer chaque case avec la couleur de la matière (fallback primary)
- Superposer un badge « Remplacé » ou « Assuré par X » quand un `remplacements` actif recouvre le créneau à la date affichée

### 4. Actions utiles
- Bouton « Exporter PDF » réutilisant `generateEmploiDuTempsExports` (l'export enseignant existe déjà)
- Bouton « Imprimer »
- Compteur d'heures : total heures / semaine à droite du nom

### 5. États et gardes
- Skeleton pendant le chargement
- Message « Aucun créneau planifié pour cet enseignant » si la grille est vide
- Message « Aucun enseignant enregistré » si la table est vide, avec lien vers l'onglet Personnel

### 6. Fichiers touchés
- `src/pages/enseignants/sections/StaffSchedule.tsx` : réécriture complète
- Réutilisation des hooks : `useEnseignants`, `useEcoleId`, `useAnneeId`
- Nouveau petit hook local `useTeacherSchedule(enseignantId)` dans le même fichier (ou `src/hooks/useTeacherSchedule.ts` si réutilisé ailleurs)

## Hors périmètre
- Édition inline des créneaux depuis cette page (ça reste dans le module « Emploi du temps »)
- Gestion des indisponibilités (déjà couverte ailleurs)
