# Finalisation du module Examens & Notes

Objectif : passer le module de ~85 % à 100 % fonctionnel en complétant 4 axes.

## 1. Verrouillage & validation des périodes

- Ajouter table `periodes_verrouillage` (periode_id, classe_id nullable, verrouille_par, verrouille_le, motif) ou étendre `periodes` avec `verrouillee_le/par`.
- RPC `verrouiller_periode(periode_id, classe_id?)` et `deverrouiller_periode(...)` réservées admin/direction.
- Trigger BEFORE INSERT/UPDATE/DELETE sur `notes` et `bulletins_audit` bloquant toute modification si la période concernée est verrouillée.
- UI `Validation.tsx` : tableau des périodes par classe avec statut (Ouverte / Verrouillée), bouton verrouiller/déverrouiller, historique, badge global affiché dans `GradeEntry`, `QuickGradeEntry`, `Bulletins`.

## 2. Conseils de classe — délibération complète

- Étendre `conseils_classe` : `statut` (planifie/en_cours/cloture), `pv_url`, `presidents`, `secretaire`, `membres_presents jsonb`.
- Nouvelle table `conseils_deliberations` (conseil_id, eleve_id, decision, mention, observations, vote_pour, vote_contre, abstentions).
- RPC `cloturer_conseil` : fige les décisions et pousse vers `decisions_fin_annee` / `bulletins_audit`.
- UI `ClassCouncils.tsx` : workflow 3 étapes (préparation → délibération élève par élève → clôture + PV PDF).
- Génération PV délibération PDF (utiliser `generatePVDeliberation` déjà existant + signatures).

## 3. Fin d'année — automatisation des passages

- RPC `proposer_passages_auto(annee_id, classe_id?)` : applique règles (moy ≥ 10 → Admis, 8-10 → Redouble, < 8 → Réorienté ; overrides via conseils).
- RPC `appliquer_passages(annee_id)` : crée les inscriptions dans la nouvelle année (`parcours_scolaire`, `eleves.classe_id`), archive l'ancienne.
- UI `FinAnnee.tsx` : bouton « Proposer passages », tableau éditable, validation en masse, rapport PDF « Décisions de fin d'année » (déjà présent dans registry).

## 4. Notifications parents des bulletins

- RPC `notifier_bulletin(eleve_id, periode_id, canal)` → utilise `send-sms` / `send-whatsapp` existants + template configurable.
- Étendre `BulletinSendDialog.tsx` avec choix canal (SMS / WhatsApp / Email) et envoi groupé par classe.
- Journalisation dans `notifications_parents` avec statut (envoyé/échec) et lien de téléchargement sécurisé du PDF.
- Bouton « Envoyer à tous les parents » depuis `Bulletins.tsx` (progression + rapport final).

## Détails techniques

```text
Migrations SQL (ordre)
1. periodes → colonnes verrouillage + trigger blocage notes/bulletins
2. conseils_classe + conseils_deliberations (GRANT + RLS + policies has_role admin/direction)
3. RPC proposer_passages_auto / appliquer_passages
4. RPC notifier_bulletin (SECURITY DEFINER, appelle edge functions via net.http_post ou renvoie payload au client)

Fichiers front à modifier
- src/pages/examens/sections/Validation.tsx        (refonte complète)
- src/pages/examens/sections/ClassCouncils.tsx     (workflow délibération)
- src/pages/examens/sections/FinAnnee.tsx          (automatisation passages)
- src/pages/examens/sections/Bulletins.tsx         (envoi groupé)
- src/components/bulletins/BulletinSendDialog.tsx  (canal + multi-envoi)

Hooks nouveaux
- useVerrouillagePeriodes
- useConseilsDeliberations
- usePassagesAuto
```

## Ordre d'implémentation proposé

1. Verrouillage périodes (base de sécurité pour le reste)
2. Notifications parents (valeur immédiate pour utilisateurs actuels)
3. Conseils de classe complet
4. Fin d'année automatisée

Chaque axe est livré et testable indépendamment.
