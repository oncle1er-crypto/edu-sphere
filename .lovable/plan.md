## Finalisation Examens & Notes — Lot A + Lot B

### Lot A — Configuration (`ExamsConfig.tsx`)

**Migration** — étendre `parametres_matieres` avec les colonnes manquantes :
- `systeme_notation` text default `'20'` (valeurs : `20`, `100`, `gpa`, `lettre`)
- `decimales_affichees` int default `2`
- `arrondi` text default `'arithmetique'` (`arithmetique`, `superieur`, `inferieur`)
- `autoriser_notes_hors_bareme` boolean default `false`
- `afficher_mentions` boolean default `true`
- `afficher_rang` boolean default `true`
- `afficher_appreciation` boolean default `true`
- `texte_pied_bulletin` text nullable
- `signature_directeur_url` text nullable

**Réécriture `ExamsConfig.tsx`** :
- Utiliser le hook existant `useParametresMatieres` (déjà créé au lot 1.2).
- Chaque champ (Select, Input, Switch, Textarea) branché avec sauvegarde onBlur/onCheckedChange.
- Skeleton pendant chargement.
- Retirer tous les `defaultValue` non branchés.

### Lot B — Rapports pédagogiques (`Reports.tsx`)

**Réécriture complète** avec 6 générateurs réels branchés sur la base :

| Rapport | Source données | Format | Filtres |
|---|---|---|---|
| PV de délibération | `bulletins_audit` + `classes` + `eleves` | PDF (jsPDF) | classe, période |
| Relevés de notes | `notes` + `evaluations` + `matieres` + `eleves` | PDF | élève, période |
| Statistiques par matière | agrégation SQL sur `notes` × `matieres` | Excel (xlsx) | période |
| Palmarès trimestriel | top N `bulletins_audit.moyenne` | PDF | classe/niveau, période |
| Rapport d'évolution | moyennes multi-périodes par élève | Excel | classe |
| Liste admis/redoublants | `decisions_fin_annee` | PDF | classe |

**Détails techniques** :
- `jspdf` et `jspdf-autotable` déjà présents (`generateEmploiDuTempsExports`).
- `xlsx` déjà présent dans le projet.
- Chaque bouton "Générer" ouvre un dialog de filtres (classe + période via `useClasses` + `useAcademicPeriod`), puis lance la génération et déclenche le téléchargement.
- Toast succès/erreur.
- États : "Aucune donnée" si résultat vide.

### Fichiers touchés

**Nouveaux** :
- Migration `parametres_matieres` (ajout colonnes).
- `src/lib/reports/pvDeliberation.ts`
- `src/lib/reports/releveNotes.ts`
- `src/lib/reports/statsMatiere.ts`
- `src/lib/reports/palmares.ts`
- `src/lib/reports/evolutionMoyennes.ts`
- `src/lib/reports/decisionsFinAnnee.ts`

**Modifiés** :
- `src/hooks/useGradingScales.ts` (typing des nouvelles colonnes via Database types après migration).
- `src/pages/examens/sections/ExamsConfig.tsx` (réécriture complète).
- `src/pages/examens/sections/Reports.tsx` (réécriture complète avec dialog + boutons de génération).

### Vérifications

- Compilation TS.
- Playwright : `/examens/configuration` (modifier un champ → recharger → valeur persistée) et `/examens/rapports` (cliquer un bouton, vérifier download déclenché via `page.expect_download()`).
- Zéro erreur console.

### Hors périmètre

- Refonte des maquettes PDF (mise en page minimale conforme MENA, pas de logos personnalisés).
- Envoi automatique par email (existant via module Communication plus tard).

Une fois validé, Examens & Notes = **100 % branché Cloud, zéro mock**.
