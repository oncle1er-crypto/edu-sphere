# Standardisation des exports de rapports (CSV · Excel · PDF)

## Objectif
Chaque rapport de l'application propose systématiquement les **3 formats** : CSV, Excel (.xlsx) et PDF, avec un rendu homogène (entête école, logo, filtres appliqués, pagination PDF, formatage FCFA).

## État actuel (11 pages de rapports)

| Page | CSV | Excel | PDF |
|---|---|---|---|
| Classes › Rapports | ✅ | ❌ | ❌ |
| Matières › Rapports | ✅ | ❌ | ❌ |
| Cours vacances › Rapports | ❌ | ✅ | ✅ |
| Statistiques › Rapports globaux | ❌ | ✅ (2) | ✅ (4) |
| Services ponctuels › Rapports | ❌ | ✅ | ✅ |
| Finances › Rapports | ❌ | partiel | ✅ |
| Examens › Rapports | ❌ | partiel | ✅ |
| Bibliothèque › Rapports | ❌ | ❌ | ❌ (boutons factices) |
| Cantine › Rapports | à auditer | | |
| Transport › Rapports | à auditer | | |
| Présences › Rapports | à auditer | | |

## Approche

### 1. Utilitaire partagé `src/lib/reports/exporters.ts`
Trois fonctions génériques prenant `{ title, columns, rows, filename, ecole?, sousTitre? }` :
- `exportRowsCSV(...)` — BOM UTF-8, séparateur virgule, échappement.
- `exportRowsXLSX(...)` — via `xlsx`, largeurs auto, entête gras.
- `exportRowsPDF(...)` — via `jspdf` + `jspdf-autotable`, entête école (logo + sigle + devise), pagination, pied de page, montants formatés manuellement (évite le bug « barre noire »).

### 2. Composant partagé `src/components/reports/ReportExportButtons.tsx`
Trois boutons compacts (CSV / Excel / PDF) + état `loading` par format. Signature :
```
<ReportExportButtons
  title="Liste nominative"
  filename="liste_nominative"
  columns={[...]}
  getRows={async () => [...]}
  sousTitre="Période : ..."
/>
```

### 3. Refactor page par page
Remplacer les boutons existants par `ReportExportButtons`. Pour les rapports qui ne sont aujourd'hui que des CSV (Classes, Matières) ou factices (Bibliothèque), brancher la vraie source de données.

Ordre d'exécution :
1. Lot A — Utilitaires + composant partagé.
2. Lot B — Pages déjà branchées : Classes, Matières, Cours vacances, Services ponctuels.
3. Lot C — Pages mixtes : Statistiques, Finances, Examens.
4. Lot D — Pages à finaliser (données réelles) : Bibliothèque, Cantine, Transport, Présences.

## Détails techniques
- Bibliothèques déjà présentes : `xlsx`, `jspdf`, `jspdf-autotable` → aucune install.
- Entête PDF réutilise `useEcoleInfo` (logo + sigle + devise + adresse).
- Formatage FCFA via helper local (pas d'`Intl.NumberFormat` dans jsPDF).
- Aucune migration DB requise.

## Livrable
Tous les rapports listés ci-dessus exposent 3 boutons **CSV · Excel · PDF** fonctionnels avec entête école cohérente.

Confirmez pour lancer les 4 lots (je peux tout enchaîner ou m'arrêter après le Lot B pour test).
