## Assistant « Clôture & ouverture d'année »

Un nouvel écran dédié dans **Écoles → Années scolaires** qui guide l'utilisateur en 6 étapes pour clôturer proprement l'année en cours et préparer la suivante, avec actions sélectionnables et rapport final.

---

### Étape 1 — Création de la nouvelle année
- Formulaire : libellé, date début, date fin, découpage (trimestre/semestre).
- Génération automatique des périodes.
- Statut initial : `preparation`.

### Étape 2 — Grille tarifaire
- Choix : **Reconduire à l'identique** / **Reconduire puis modifier** / **Repartir de zéro**.
- Appel à `dupliquer_grille_annee` si reconduction.

### Étape 3 — Promotion des élèves
- Tableau récapitulatif par classe avec compteurs (passage / redoublement / exclusion) basés sur `decisions_fin_annee`.
- Bouton **Appliquer les décisions verrouillées** → appel de `appliquer_decisions_fin_annee` (existant).
- Pour les élèves sans décision : règle par défaut configurable (passage automatique vers la classe N+1 selon le mapping ci-dessous).
- Mapping de promotion : PS→MS, MS→GS, GS→CP, CP→CE1, CE1→CE2, CE2→CM1, CM1→CM2, CM2→6ème, etc.
- Les élèves promus sont **rattachés à la nouvelle année** au statut `pre_inscrit` (nouvelle ligne dans `eleves` pour `annee_id = annee_cible`, ou réutilisation de la fiche en gardant l'historique via `parcours_scolaire`).

### Étape 4 — Reconduction des affectations pédagogiques
- Cases à cocher pour reconduire :
  - **Affectations enseignants ↔ matières** (`enseignant_matieres`)
  - **Affectations matières ↔ classes** (`classe_matieres` avec volumes horaires)
  - **Emploi du temps** (`creneaux_emploi_temps`) — option proposée mais désactivée par défaut (recommandation : régénérer).
- Copie ligne à ligne avec `annee_id = annee_cible`.

### Étape 5 — Renouvellement des services
- **Cartes scolaires** : redirection vers `CardsRenewal` (déjà existant) ou exécution directe.
- **Abonnements cantine** : reconduire les abonnés actifs (`abonnements_cantine` avec nouveau `annee_id`).
- **Abonnements transport** : idem (`abonnements_transport`).
- Cases à cocher individuelles.

### Étape 6 — Activation
- Récapitulatif des actions effectuées (compteurs : X élèves promus, Y affectations copiées, Z abonnements renouvelés…).
- Bouton **Activer la nouvelle année** : passe l'ancienne en `verrouillee`, la nouvelle en `active`.
- Confirmation explicite avec saisie du libellé de l'année.

---

### Détails techniques

**Migration SQL** — nouvelles fonctions SECURITY DEFINER (admin/directeur uniquement) :

```text
promouvoir_eleves_annee(_ecole_id, _annee_source, _annee_cible, _mapping jsonb, _mode text)
  → crée/met à jour les eleves pour annee_cible, statut pre_inscrit
  → enregistre dans parcours_scolaire
  → retourne {promus, redoubles, sans_decision}

reconduire_affectations_pedagogiques(_ecole_id, _annee_source, _annee_cible, _options jsonb)
  → copie classe_matieres et/ou enseignant_matieres
  → optionnellement creneaux_emploi_temps
  → retourne compteurs

renouveler_abonnements(_ecole_id, _annee_source, _annee_cible, _types text[])
  → duplique abonnements_cantine/transport actifs
  → retourne compteurs

activer_annee_scolaire(_ecole_id, _annee_id)
  → verrouille les autres années actives
  → bascule annee_id en 'active'
```

**Fichiers UI à créer** :
- `src/pages/ecoles/sections/SchoolsYearTransition.tsx` — écran assistant 6 étapes avec stepper.
- `src/pages/ecoles/components/PromotionMappingEditor.tsx` — éditeur du mapping de promotion par défaut.
- `src/hooks/useYearTransition.ts` — hook regroupant les appels RPC.
- Route + entrée de menu dans `SchoolsLayout.tsx` : « Transition d'année ».

**Aucune modification destructive** : toutes les données de l'année source restent intactes ; tout est duplication vers l'année cible.

Estimation : 1 migration SQL + 4 fichiers TSX + 1 ajout de route.