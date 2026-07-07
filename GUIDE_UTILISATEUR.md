# Guide d'utilisation GSP — La Providence
## Maîtriser l'application en 20 minutes

> Application de gestion scolaire du **Groupe Scolaire La Providence** (Abidjan, Côte d'Ivoire).
> Ce guide est conçu pour qu'un nouvel utilisateur soit opérationnel en **20 minutes chrono**.

---

## ⏱️ Minute 0-2 — Connexion & premiers repères

1. **Se connecter** : ouvrez l'URL de l'application, saisissez votre email et votre mot de passe.
   - Si la MFA (double authentification) est activée, saisissez le code reçu par SMS ou depuis votre application d'authentification.
   - Sur un appareil personnel, cochez « Appareil de confiance » pour éviter la MFA à chaque connexion (30 jours).
2. **Repères visuels** :
   - **Barre latérale gauche** : navigation entre les modules.
   - **En-tête** : recherche globale, notifications, menu utilisateur (profil, installation PWA, déconnexion).
   - **Pied de page** : version de l'app et indicateur en ligne / hors-ligne.
3. **Installer l'application** (recommandé) : menu utilisateur → **Installer l'application**. GSP devient accessible depuis le bureau/l'écran d'accueil comme une vraie application (mode hors-ligne partiel).

---

## ⏱️ Minute 2-4 — Comprendre l'architecture

L'application est **multi-tenant** : chaque école a ses propres données, strictement isolées.
Tout tourne autour de **3 notions clés** :

| Notion | Rôle |
|---|---|
| **École** | Établissement rattaché à votre compte. |
| **Année scolaire** | Période d'exploitation (ex. 2025-2026). Une seule année est **active** à la fois. |
| **Classe** | Rattache les élèves à un niveau et à une année. |

👉 **Règle d'or** : avant de créer élèves, notes ou factures, vérifiez toujours que **l'année active** affichée en haut est la bonne.

---

## ⏱️ Minute 4-8 — Tour des 12 modules

Depuis la barre latérale, vous accédez à :

### 1. **Tableau de bord** (`/`)
Vue synthétique : effectifs, présences du jour, alertes financières, prochains conseils de classe.

### 2. **Écoles** (`/ecoles`)
Configuration de l'établissement : identité, années scolaires, cycles, périodes (trimestres/semestres), **Transition d'année** (assistant en 6 étapes pour clôturer une année et ouvrir la suivante).

### 3. **Classes** (`/classes`)
Création des classes, affectation aux cycles, gestion des salles, effectifs, transferts inter-classes.

### 4. **Matières** (`/matieres`)
Liste des matières, barèmes, coefficients, volumes horaires, affectation matière↔classe, matière↔enseignant.

### 5. **Élèves** (`/eleves`)
Cœur de l'application :
- **Inscription** : dossier + documents + premier paiement → passage de `pré-inscrit` à `inscrit`.
- **Fiche élève** : identité, parents, parcours, présences, notes, finances, cartes.
- **Décisions de fin d'année** : passage, redoublement, transfert, exclusion.

### 6. **Personnel / Enseignants** (`/enseignants`)
RH : contrats, paie, formations, évaluations, recrutement, emploi du temps individuel.

### 7. **Emploi du temps** (`/emploi`)
Génération automatique, gestion des conflits, disponibilités, salles, remplacements, impression.

### 8. **Présences** (`/presences`)
Appel quotidien, retards, absences, justifications, sanctions.

### 9. **Examens & bulletins** (`/examens`)
Évaluations, compositions, conseils de classe, publication des bulletins PDF, tableau d'honneur, **fin d'année**.

### 10. **Finances** (`/finances`)
Frais de scolarité (grille tarifaire par niveau), tranches, factures, paiements (dont Wave), relances SMS, dépenses, budget, trésorerie, compte de résultat.

### 11. **Bibliothèque / Cantine / Transport / Cartes**
Modules annexes : catalogue et prêts, abonnements et menus, lignes et véhicules, cartes scolaires et badges.

### 12. **Communication** (`/communication`)
Annonces, notifications aux parents (SMS/WhatsApp), messages internes.

---

## ⏱️ Minute 8-11 — Le cycle de vie d'un élève

C'est le workflow le plus important. Mémorisez-le :

```text
Pré-inscription (dossier ouvert)
      │  → Documents fournis + 1er paiement encaissé
      ▼
Inscrit (élève actif sur l'année en cours)
      │  → Notes, présences, facturation, bulletins
      ▼
Fin d'année → Décision (Passage / Redoublement / Transfert / Exclusion)
      │  → Décision : Brouillon → Validée → Verrouillée
      ▼
Assistant Transition d'année (Écoles → Transition)
      │  → Application automatique des décisions verrouillées
      ▼
Nouvelle année active (l'élève est rattaché à sa nouvelle classe)
```

**Statuts à connaître** :
- **Élève** : `pré-inscrit`, `inscrit`, `sorti`, `exclu`.
- **Tranche financière** : `due`, `partielle`, `payée`, `retard`.
- **Décision fin d'année** : `brouillon` → `validée` → `verrouillée` (seules les verrouillées sont appliquées).

---

## ⏱️ Minute 11-14 — Encaisser un paiement (le geste le plus fréquent)

1. **Finances → Paiements** ou depuis la **fiche élève → onglet Finances**.
2. Cliquez sur la tranche à encaisser (`due` ou `partielle`).
3. Renseignez : montant, mode (espèces / Wave / virement), date, référence.
4. Validez → la tranche passe à `partielle` ou `payée`, un **reçu PDF** est généré, un **SMS de confirmation** part au parent si activé.
5. En cas d'erreur : ouvrez le paiement → **Annuler** (traçabilité conservée dans l'audit).

💡 **Astuce Wave** : le lien de paiement Wave peut être envoyé au parent depuis la relance SMS ; le paiement s'enregistre automatiquement à la réception.

---

## ⏱️ Minute 14-17 — Saisir des notes et publier un bulletin

1. **Portail enseignant** (`/portail-enseignant`) ou **Examens → Évaluations**.
2. Créez une évaluation : matière, classe, période, barème, coefficient, date.
3. Cliquez sur l'évaluation → **Saisie des notes** : tableau élève par élève, sauvegarde automatique.
4. Une fois toutes les notes saisies : **Valider** (verrouille la saisie).
5. **Examens → Bulletins** : générez les bulletins de la période, prévisualisez, puis **Publier** → PDF disponible côté parents.
6. **Conseils de classe** : réunion validée → décisions et appréciations globales figurent sur le bulletin.

---

## ⏱️ Minute 17-19 — Fin d'année : clôturer et ouvrir la suivante

Écran dédié : **Écoles → Transition d'année** (assistant en 6 étapes).

1. **Créer la nouvelle année** (libellé, dates, découpage).
2. **Grille tarifaire** : reconduire, modifier, ou repartir de zéro.
3. **Promotion des élèves** : applique les décisions verrouillées + règle par défaut (PS→MS, CP→CE1, …).
4. **Affectations pédagogiques** : reconduire matières↔classes, enseignants↔matières.
5. **Services** : cartes scolaires, cantine, transport → renouvellement en un clic.
6. **Activation** : la nouvelle année devient `active`, l'ancienne passe en `verrouillée`.

⚠️ **Aucune destruction** : toutes les données de l'année source restent consultables en lecture.

---

## ⏱️ Minute 19-20 — Bonnes pratiques & raccourcis

- 🔍 **Recherche globale** (barre du haut) : trouve un élève, une facture, une classe.
- 📅 **Sélecteur d'année** en haut : basculez ponctuellement pour consulter l'historique.
- 🔒 **Verrouillez** vos décisions avant d'appliquer la transition d'année (sinon elles sont ignorées).
- 📱 **Installez la PWA** sur mobile : appel des présences, consultation d'une fiche élève même sans réseau.
- 🆘 **Bandeaux d'aide** (bleus) en haut de chaque page : cliquez sur le "X" une fois lu, ils ne reviennent plus.
- 🧾 **Exports** : la plupart des tableaux ont un bouton export Excel/PDF en haut à droite.
- 👥 **Permissions** : demandez à l'administrateur les droits `view / create / update / delete / export` par module.

---

## 🗺️ Aide-mémoire des routes clés

| Action | Chemin |
|---|---|
| Inscrire un élève | `/eleves` → Nouveau |
| Encaisser un paiement | `/finances/paiements` |
| Faire l'appel | `/presences` |
| Saisir des notes | `/portail-enseignant` |
| Publier un bulletin | `/examens/bulletins` |
| Générer l'emploi du temps | `/emploi/generation` |
| Envoyer une annonce | `/communication/annonces` |
| Transition d'année | `/ecoles/transition` |

---

## ✅ Check-list « je suis prêt »

- [ ] Je sais changer d'année active et je sais laquelle est la bonne.
- [ ] Je peux inscrire un nouvel élève de A à Z.
- [ ] J'encaisse un paiement et j'envoie un reçu.
- [ ] Je saisis une évaluation et je publie un bulletin.
- [ ] Je lance l'assistant de transition d'année.
- [ ] Je sais installer l'application sur mobile.

Bravo, vous maîtrisez GSP ! 🎓

---

# 🚧 Modules & aspects en attente de traitement

État des lieux des points à finaliser pour un fonctionnement optimal en production :

## 🔴 Priorité HAUTE (bloquant ou critique)

1. **Assistant de transition d'année — finaliser les RPC serveur**
   - `promouvoir_eleves_annee`, `reconduire_affectations_pedagogiques`, `renouveler_abonnements`, `activer_annee_scolaire` doivent être créées côté base (le plan est écrit dans `.lovable/plan.md`, l'UI existe mais s'appuie sur des appels partiels).
2. **Empêcher les doublons d'année scolaire** — ajouter une contrainte unique `(ecole_id, libelle)` sur `annees_scolaires` + garde côté UI (déjà signalé précédemment).
3. **Politique de rôles centralisée** — vérifier que **toutes** les tables `public.*` ont des GRANT explicites et des policies scoped par `ecole_id` (audit à mener sur les 90+ tables).
4. **Sécurité MFA** — le service worker de la PWA ne doit jamais mettre en cache les endpoints d'auth (contrôle à ajouter dans `vite.config.ts` via `navigateFallbackDenylist`).
5. **Sauvegarde / export global** — aucune procédure d'export de sauvegarde par école n'est actuellement offerte à l'admin école.

## 🟠 Priorité MOYENNE (fonctionnalités partielles)

6. **Portail parents** — absent : les parents ne peuvent pas se connecter pour consulter bulletins, factures, absences.
7. **Portail élèves** — absent pour les grandes classes (accès emploi du temps, notes, devoirs).
8. **Devoirs & cahier de textes** — non modélisés (table + UI à créer).
9. **Discipline / conseil de discipline** — table `incidents_discipline` existe mais workflow complet (convocation, PV, sanction) à câbler.
10. **Infirmerie** — `visites_infirmerie` OK, mais pas de suivi vaccinal ni de fiche médicale complète.
11. **Paie enseignants** — `bulletins_paie` existe, mais génération PDF officielle CNPS/impôts à finaliser.
12. **Comptabilité** — le compte de résultat est basique, un vrai plan comptable OHADA reste à intégrer.
13. **Notifications push** (via la PWA) — service worker prêt, mais aucun envoi côté serveur.
14. **WhatsApp Business** — edge function `send-whatsapp` existe, la config du template et de la vérification Meta n'est pas documentée pour l'admin.
15. **Générateur d'emploi du temps** — algorithme automatique à renforcer (résolution des conflits salles/enseignants).

## 🟡 Priorité BASSE (améliorations UX / qualité)

16. **Recherche globale** dans l'en-tête — actuellement limitée, à étendre aux factures et documents.
17. **Journalisation d'audit** — tables `audit_logs` et `security_audit_logs` sous-utilisées ; ajouter une vue admin.
18. **Import CSV** — dialog générique présent (`ImportDialog`) mais peu de modules le branchent (élèves, matières, enseignants à couvrir).
19. **Tests automatisés** — seulement un test d'exemple (`src/test/example.test.ts`) ; couvrir hooks critiques (`useDepenses`, `useDecisionsFinAnnee`, `usePermissions`).
20. **Internationalisation** — l'app est en français uniquement ; pas de i18n prévu (probablement non requis mais à confirmer).
21. **Accessibilité (a11y)** — audit WCAG à mener (contrastes des couleurs bordeaux/or, focus visibles, ARIA sur tableaux).
22. **Documentation utilisateur intégrée** — les `HelpBanner` sont présents sur peu de pages ; en étendre la couverture.
23. **Rapports statistiques avancés** — module `/statistiques` existe mais peu de graphiques croisés (effectifs vs finances, présences vs résultats).
24. **Gestion des anciens élèves (alumni)** — pas de suivi post-scolarité.

---

*Guide généré le 7 juillet 2026. Version de l'application : voir pied de page.*
