# Gestion complète — Contrats & affectations enseignants

Objectif : transformer la section actuelle (tableau lecture seule) en un vrai module RH couvrant les 4 volets demandés.

## 1. CRUD complet des contrats

Nouvelle table `contrats_enseignants` (multi-tenant, `ecole_id`) :
- enseignant_id, type (CDD/CDI/vacation/stage), statut (brouillon/actif/suspendu/rompu/terminé)
- date_debut, date_fin, periode_essai_fin, preavis_jours
- salaire_base, primes (jsonb), quotite (temps plein / partiel %)
- motif_rupture, date_rupture
- notes, cree_par, signe_le

Actions UI :
- Créer / modifier / renouveler (crée un nouveau contrat lié) / résilier (dialog avec motif obligatoire)
- Historique par enseignant (drawer avec timeline des contrats successifs et avenants)

## 2. Affectations pédagogiques

Réutilise la table existante `enseignant_matieres` (déjà présente : enseignant_id, matiere_id, classe_id, annee_id) + ajout colonne `volume_horaire_hebdo`.

UI dédiée dans "Contrats & affectations" :
- Vue par enseignant : ses classes × matières × heures/semaine
- Ajout/retrait rapide via combobox (matière, classe)
- Total heures calculé automatiquement + alerte si > quotité contrat

## 3. Documents & avenants

Réutilise `enseignants_documents` (déjà en base) + nouveau bucket storage `contrats-enseignants` (privé, RLS par ecole_id).

UI :
- Upload PDF (contrat signé, avenants, pièces RH)
- Liste chronologique avec type (contrat initial / avenant / rupture / autre)
- Téléchargement sécurisé via URL signée

## 4. Alertes fins de contrat

Dashboard en tête de la section :
- KPI : contrats actifs, CDD < 30j, périodes d'essai à valider, contrats sans documents
- Tableau "À traiter" : contrats dont `date_fin` < today + 30j ou `periode_essai_fin` < today + 7j
- Notifications parents inutiles ici — juste badge visuel + toast à l'ouverture

## Structure UI

Refonte de `src/pages/enseignants/sections/StaffContracts.tsx` :

```text
┌ Header (KPI + alertes fin de contrat)
├ Onglets :
│   • Liste des contrats  (tableau + filtres type/statut + recherche + export CSV)
│   • Affectations pédago (par enseignant, classes × matières × heures)
│   • Documents           (upload + liste par enseignant)
└ Dialogs : NouveauContratDialog, ResilierDialog, RenouvelerDialog, AffectationDialog, UploadDocDialog
```

## Détails techniques

**Migrations SQL :**
1. Créer `public.contrats_enseignants` + GRANT authenticated/service_role + RLS (has_ecole_role admin/directeur pour écrire, tous rôles école pour lire)
2. `ALTER TABLE enseignant_matieres ADD COLUMN volume_horaire_hebdo numeric`
3. Trigger `updated_at`
4. Vue `v_contrats_alertes` (fin < 30j, essai < 7j) — optionnel, sinon calcul côté client
5. Fonction `resilier_contrat(_id, _motif, _date)` en SECURITY DEFINER (audit + update)

**Storage :** bucket `contrats-enseignants` privé + policies RLS objects (path = `{ecole_id}/{enseignant_id}/{file}`)

**Hooks nouveaux :**
- `useContratsEnseignants(ecoleId)` — CRUD + alertes
- `useAffectationsPedagogiques(enseignantId)` — via enseignant_matieres
- `useContratsDocuments(enseignantId)` — upload/list/delete

**Composants nouveaux (`src/pages/enseignants/components/`) :**
- `ContractsDashboard.tsx`, `ContractsTable.tsx`, `AssignmentsPanel.tsx`, `DocumentsPanel.tsx`
- `NewContractDialog.tsx`, `TerminateContractDialog.tsx`, `RenewContractDialog.tsx`, `AssignmentDialog.tsx`, `UploadContractDocDialog.tsx`

**Sécurité :**
- Contrats accessibles seulement à admin/directeur pour écrire; comptable en lecture (pour la paie); enseignant voit seulement les siens
- Audit dans `security_audit_logs` sur création/résiliation

**Périmètre exclu volontairement :**
- Signature électronique (juste un statut "signé le" manuel)
- Génération auto du PDF de contrat (upload manuel dans cette itération)
