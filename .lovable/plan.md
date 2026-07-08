# Emploi du temps — passage à 100 %

Objectif : rendre le module entièrement fonctionnel en persistant la Configuration et les Notifications, puis en corrigeant les 5 incohérences qui empêchent aujourd'hui les onglets de dialoguer entre eux.

## 1. Onglet « Configuration » — passage en mode réel

Créer une table `parametres_emploi_temps` (une ligne par école) qui centralise la config utilisée partout ailleurs dans le module.

Champs stockés :
- Heure début / heure fin de la journée
- Durée d'un créneau (min) et durée des récréations
- Jours ouvrés (lun-ven ou lun-sam)
- Verrouiller après publication (bool)
- Auto-générer remplacements (bool)
- Pause déjeuner (bornes début/fin)

Écran : chargement + sauvegarde via le bouton standard de `SettingsSection`, toasts de succès/erreur, valeurs par défaut si aucune ligne n'existe encore.

## 2. Onglet « Notifications » — passage en mode réel

Étendre la même table (ou ajouter `parametres_notifications_edt`) avec :
- Notifier modifications / remplacements / annulations (3 bools)
- Canaux Email / SMS / Push actifs
- Modèle de message (texte avec variables `{{matiere}} {{date}} {{heure}} {{classe}} {{action}}`)

Câblage côté code : au moment où un créneau est ajouté / modifié / supprimé (hook `useEmploiDuTemps`) et lorsqu'un remplacement change de statut (`Substitutions.tsx`), si l'option est active on envoie un message aux parents/élèves de la classe concernée via l'edge function `send-sms` déjà en place (et `send-whatsapp` si disponible). Le modèle est interpolé avec les données du créneau.

## 3. Correction des 5 incohérences

**a) Unification `salle` ↔ `salle_id`**
- Migrer les valeurs textuelles existantes de `creneaux_emploi_temps.salle` vers `salle_id` (matching par `code` dans `salles`, sinon création automatique d'une salle « standard »).
- `WeeklyView` : remplacer le champ texte libre par un `<Select>` alimenté par `useSalles`.
- Le dashboard et RoomAssignment utiliseront alors les mêmes données.

**b) Slots horaires dynamiques dans la Vue hebdomadaire**
- Supprimer le tableau `SLOTS` hardcodé de `WeeklyView.tsx`.
- Le construire à partir de la config (heure début, heure fin, durée créneau, pause déjeuner, jours ouvrés).

**c) Plages dynamiques dans la Génération automatique**
- `AutoGenerate.tsx` lit la config au lieu d'utiliser `[08:00, 12:00]` / `[14:00, 17:00]` / `jours=[1..5]` en dur.
- L'option « samedi ouvré » ajoute automatiquement le jour 6.

**d) Bug « matières lourdes le matin »**
- La variable `matinLourd` est déjà dans l'UI ; l'ajouter au type `GenerateOptions`, la passer à `generateEmploiDuTemps`, et l'utiliser dans le scoring de placement (matières à fort coefficient priorisées avant 12 h).

**e) Validation dispos + salle à la saisie manuelle**
- Dans `useEmploiDuTemps.addCreneau` : après le check de chevauchement, vérifier via une RPC `check_creneau_feasibility` que (i) l'enseignant est disponible sur la demi-journée concernée, (ii) la salle sélectionnée n'est pas déjà occupée sur ce créneau, (iii) la salle a une capacité ≥ effectif de la classe (warning, pas blocage).
- Retour utilisateur : toast d'erreur (bloquant) ou d'avertissement (non bloquant).

## Détails techniques

Migrations à créer :
1. `CREATE TABLE public.parametres_emploi_temps` (ecole_id UNIQUE, tous les champs ci-dessus, `created_at`, `updated_at`, trigger `updated_at`), + GRANT + RLS (SELECT/INSERT/UPDATE réservé aux membres de l'école, DELETE admin).
2. `ALTER TABLE creneaux_emploi_temps` : rendre `salle_id` la source de vérité, conserver `salle` en colonne dérivée le temps de la migration, puis backfill.
3. Nouvelle RPC `check_creneau_feasibility(_ecole_id, _annee_id, _classe_id, _enseignant_id, _salle_id, _jour, _heure_debut, _heure_fin)` retournant `{ ok, warnings[], errors[] }`.

Fichiers front modifiés :
- `src/pages/emploi/sections/TimetableConfig.tsx` (réécriture)
- `src/pages/emploi/sections/Notifications.tsx` (réécriture)
- `src/pages/emploi/sections/WeeklyView.tsx` (slots dynamiques + select salle)
- `src/pages/emploi/sections/AutoGenerate.tsx` (config dynamique + matinLourd)
- `src/hooks/useEmploiDuTemps.ts` (feasibility check + salle_id)
- `src/lib/generateEmploiDuTemps.ts` (option matinLourd + plages depuis config)
- `src/lib/smsText.ts` (helper d'interpolation du modèle de notif)
- Nouveau : `src/hooks/useTimetableSettings.ts` (chargement/sauvegarde de la config, partagé entre tous les onglets)

## Livraison

- 3 migrations SQL (config, salle_id, RPC feasibility)
- Réécriture de 2 composants, patch de 4 autres, 1 nouveau hook
- Aucune régression attendue sur les 9 onglets déjà fonctionnels : ils gagnent seulement la config partagée.
