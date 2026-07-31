# Enrichir le panneau d'accueil

L'espace vide au-dessus du logo « GESTION SCOLAIRE » sur la page d'accueil devient un tableau de bord vivant. Le bloc logo + devise est conservé mais décalé vers le bas, en version compacte, pour libérer le haut du panneau.

## Nouvelle structure du panneau (de haut en bas)

```text
┌──────────────────────────────────────────┐
│ Bonjour <Nom> · vendredi 31 juillet 2026 │
├──────────────────────────────────────────┤
│ [Élèves] [Enseignants] [Encaissé jour]   │  Indicateurs du jour
│ [Présence du jour]                       │
├──────────────────────────────────────────┤
│ Alertes & tâches (liens cliquables)      │
│  • 12 élèves avec impayés                │
│  • 5 factures échues                     │
│  • 8 dossiers incomplets                 │
├─────────────────────┬────────────────────┤
│ Activité récente    │ Agenda & annonces  │
├─────────────────────┴────────────────────┤
│        [logo] GESTION SCOLAIRE           │  bloc identité compacté
│     Une école, un avenir, une réussite.  │
└──────────────────────────────────────────┘
```

## Contenu de chaque bloc

**1. Bandeau d'accueil** — salutation avec le nom de l'utilisateur connecté, date du jour en français, et libellé de l'année scolaire active.

**2. Indicateurs clés du jour** (4 tuiles compactes, données réelles de l'année active)
- Élèves inscrits
- Enseignants actifs
- Encaissements du jour (scolarité + services ponctuels + factures services), en FCFA
- Taux de présence du jour

**3. Alertes & tâches** — liste de 3 à 5 lignes, chacune cliquable vers le module concerné :
- Élèves avec solde impayé → Finances
- Factures cantine/transport échues → module concerné
- Dossiers élèves incomplets (documents manquants) → Élèves
- Stocks tenues bas / réservations en attente de retrait → Services ponctuels
- Une ligne n'apparaît que si son compteur est supérieur à zéro ; si tout est au vert, un état « Tout est à jour » s'affiche.

**4. Activité récente** — les 5 derniers événements fusionnés et triés par date : paiements enregistrés, nouvelles inscriptions, incidents de discipline. Chaque ligne : icône, libellé, montant ou classe, heure relative.

**5. Agenda & annonces** — annonces internes publiées (table `annonces`) et périodes académiques à venir/en cours de l'année active, limitées aux 4 prochaines entrées.

**6. Bloc identité (conservé, déplacé en bas)** — logo, titre « GESTION SCOLAIRE », séparateur doré, devise. Version réduite : logo ~72 px au lieu de 144 px, titre plus petit, pour rester présent sans occuper la moitié du panneau.

## Comportement

- Chargement : squelettes par bloc, pas d'écran vide ni de flash.
- Tout est filtré par `ecole_id` et par l'année scolaire active.
- Aucune donnée : chaque bloc affiche un message court à la place d'un compteur à zéro.
- Responsive : sur mobile les tuiles passent en 2 colonnes, activité et agenda s'empilent.
- Les rôles sans accès à un module ne voient pas l'alerte correspondante (contrôle via les permissions existantes).

## Détails techniques

- `src/components/HeroPanel.tsx` est restructuré : il compose de nouveaux sous-composants et garde le bloc identité en bas, compacté.
- Nouveaux composants dans `src/components/home/` : `HomeGreeting`, `HomeQuickStats`, `HomeAlerts`, `HomeActivity`, `HomeAgenda`.
- Nouveau hook `src/hooks/useHomeOverview.ts` : une seule passe de requêtes parallèles (`eleves`, `enseignants`, `paiements`, `sp_paiements`, `paiements_services`, `presences`, `tranches`, `factures`, `documents_eleves`, `incidents_discipline`, `annonces`, `periodes`) avec agrégats en `count: exact, head: true` quand seul le compteur est nécessaire.
- Réutilisation de `useEcoleId`, `useAcademicPeriod`, `usePermissions` et des tokens sémantiques existants (`primary` bordeaux, `accent` jaune) — aucune couleur en dur.
- La grille de `src/pages/Home.tsx` reste inchangée ; seul le contenu de la colonne droite évolue.
