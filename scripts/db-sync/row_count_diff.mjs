// Compare le nombre de lignes de CHAQUE table "public" entre prod et local.
// Complète schema_diff.mjs : une table peut avoir un schéma identique mais
// des données manquantes (chargement interrompu, table oubliée dans un lot,
// dérive normale si la prod a reçu de nouvelles données après l'export).
//
// Entrée prod : résultat JSON de la requête suivante via query_database
// (voir README.md) :
//   SELECT table_name,
//     (xpath('/row/cnt/text()', query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', table_name), false, true, '')))[1]::text::bigint AS row_count
//   FROM information_schema.tables
//   WHERE table_schema='public' AND table_type='BASE TABLE'
//   ORDER BY table_name;
// -> fichier JSON { rows: [{table_name, row_count}, ...] }
//
// Entrée locale : sortie de la MÊME requête exécutée via psql en local,
// au format "table_name|row_count" une paire par ligne (option psql -F'|').
//
// Usage : node row_count_diff.mjs <prod_counts.json> <local_counts.txt>
import { readFileSync } from 'fs';

const [, , prodFile, localFile] = process.argv;
if (!prodFile || !localFile) {
  console.error('Usage: node row_count_diff.mjs <prod_counts.json> <local_counts.txt>');
  process.exit(2);
}

const prodRaw = JSON.parse(readFileSync(prodFile, 'utf-8'));
const prod = Array.isArray(prodRaw) ? prodRaw : prodRaw.rows;

const localRaw = readFileSync(localFile, 'utf-8');
const local = {};
for (const m of localRaw.matchAll(/([a-z0-9_]+)\|(\d+)/g)) {
  local[m[1]] = parseInt(m[2], 10);
}

const diffs = [];
for (const r of prod) {
  const l = local[r.table_name];
  if (l === undefined) { diffs.push(`${r.table_name}: ABSENTE EN LOCAL (prod=${r.row_count})`); continue; }
  if (l !== r.row_count) diffs.push(`${r.table_name}: prod=${r.row_count} local=${l} (écart ${r.row_count - l})`);
}

console.log(`Tables comparées: ${prod.length}, tables locales trouvées: ${Object.keys(local).length}`);
console.log(diffs.length ? diffs.join('\n') : 'AUCUN ÉCART');
process.exit(diffs.length ? 1 : 0);
