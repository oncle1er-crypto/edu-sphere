// Compare le schéma PostgreSQL "public" de deux sources (prod vs local) et
// signale toute dérive : tables/colonnes ajoutées ou supprimées côté prod,
// changements de type ou de nullabilité.
//
// Contexte : la base de production de ce projet est gérée par Lovable Cloud
// et n'est PAS accessible via `supabase link` (voir README.md du dossier).
// Les seules mutations de schéma "vues" par ce dépôt sont celles capturées
// dans supabase/migrations/. Si une modification de schéma a été faite
// directement en prod (par Lovable ou manuellement) sans migration
// correspondante, ce script la détecte AVANT qu'un rechargement de données
// n'échoue dessus (silencieusement ou bruyamment, selon le cas — voir README).
//
// Entrées attendues (2 formats acceptés pour chaque fichier) :
//   - Résultat brut d'un outil query_database : { rows: [ {table_name, column_name, data_type, is_nullable}, ... ] }
//   - Tableau JSON direct : [ {table_name, column_name, data_type, is_nullable}, ... ]
//
// Requête à exécuter côté prod ET côté local pour produire ces fichiers :
//   SELECT table_name, column_name, data_type, is_nullable
//   FROM information_schema.columns
//   WHERE table_schema = 'public'
//   ORDER BY table_name, ordinal_position;
//
// Usage : node schema_diff.mjs <schema_prod.json> <schema_local.json>
// Sortie : rapport texte sur stdout, code de sortie 1 si une dérive bloquante est détectée (0 sinon).
import { readFileSync } from 'fs';

function loadRows(path) {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return Array.isArray(raw) ? raw : raw.rows;
}

function toMap(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.table_name)) m.set(r.table_name, new Map());
    m.get(r.table_name).set(r.column_name, { data_type: r.data_type, is_nullable: r.is_nullable });
  }
  return m;
}

const [, , prodFile, localFile] = process.argv;
if (!prodFile || !localFile) {
  console.error('Usage: node schema_diff.mjs <schema_prod.json> <schema_local.json>');
  process.exit(2);
}

const prod = toMap(loadRows(prodFile));
const local = toMap(loadRows(localFile));

let driftFound = false;
const lines = [];

const allTables = new Set([...prod.keys(), ...local.keys()]);
const tablesOnlyProd = [...allTables].filter((t) => prod.has(t) && !local.has(t)).sort();
const tablesOnlyLocal = [...allTables].filter((t) => !prod.has(t) && local.has(t)).sort();

if (tablesOnlyProd.length) {
  driftFound = true;
  lines.push(`TABLES PRÉSENTES EN PROD MAIS ABSENTES EN LOCAL (${tablesOnlyProd.length}) :`);
  for (const t of tablesOnlyProd) lines.push(`  - ${t}`);
}
if (tablesOnlyLocal.length) {
  lines.push(`\nTables présentes en local mais absentes en prod (${tablesOnlyLocal.length}) — normal si migration non encore appliquée en prod, ou table locale de test :`);
  for (const t of tablesOnlyLocal) lines.push(`  - ${t}`);
}

for (const table of [...allTables].sort()) {
  if (!prod.has(table) || !local.has(table)) continue;
  const prodCols = prod.get(table);
  const localCols = local.get(table);
  const allCols = new Set([...prodCols.keys(), ...localCols.keys()]);
  const colsOnlyProd = [...allCols].filter((c) => prodCols.has(c) && !localCols.has(c));
  const colsOnlyLocal = [...allCols].filter((c) => !prodCols.has(c) && localCols.has(c));
  const typeMismatches = [...allCols].filter((c) => {
    if (!prodCols.has(c) || !localCols.has(c)) return false;
    const p = prodCols.get(c);
    const l = localCols.get(c);
    return p.data_type !== l.data_type || p.is_nullable !== l.is_nullable;
  });

  if (colsOnlyProd.length) {
    driftFound = true;
    lines.push(`\nTable "${table}" — colonnes en prod absentes en local (${colsOnlyProd.length}) :`);
    for (const c of colsOnlyProd) lines.push(`  - ${c} (${prodCols.get(c).data_type})`);
  }
  if (colsOnlyLocal.length) {
    lines.push(`\nTable "${table}" — colonnes en local absentes en prod (${colsOnlyLocal.length}) :`);
    for (const c of colsOnlyLocal) lines.push(`  - ${c} (${localCols.get(c).data_type})`);
  }
  if (typeMismatches.length) {
    driftFound = true;
    lines.push(`\nTable "${table}" — types/nullabilité différents (${typeMismatches.length}) :`);
    for (const c of typeMismatches) {
      lines.push(`  - ${c} : prod=${prodCols.get(c).data_type}/${prodCols.get(c).is_nullable} vs local=${localCols.get(c).data_type}/${localCols.get(c).is_nullable}`);
    }
  }
}

if (!driftFound && lines.length === 0) {
  console.log('OK — aucune dérive de schéma détectée entre prod et local.');
  process.exit(0);
}

console.log(lines.join('\n'));
console.log(
  driftFound
    ? "\n⚠️  DÉRIVE DÉTECTÉE : ne pas lancer le rechargement de données avant d'avoir créé les migrations locales correspondantes et de les avoir fait valider (voir README.md)."
    : '\n(Différences mineures listées ci-dessus, mais aucune ne bloque un rechargement de données — voir détail.)'
);
process.exit(driftFound ? 1 : 0);
