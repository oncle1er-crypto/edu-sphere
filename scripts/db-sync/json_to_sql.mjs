// Convertit un résultat query_database (fichier JSON : {rows:[{out:{table: [...]}}]})
// en un fichier .sql chargeable via psql, sans jamais faire transiter les données
// par le contexte de l'agent.
//
// Le SQL généré utilise ON CONFLICT DO NOTHING sur chaque INSERT : le
// rechargement est donc idempotent et peut être rejoué sans erreur sur des
// tables déjà partiellement peuplées (ex: tables de référence déjà seedées
// par une migration).
//
// Limites connues (voir README.md, étape 0 — vérification de dérive) :
//  - Une table présente en prod mais absente localement (pas de migration
//    correspondante) fait échouer l'INSERT généré pour cette table, et
//    ABORT le reste du lot SQL (psql -v ON_ERROR_STOP=1).
//  - Une colonne présente en prod mais absente localement est silencieusement
//    ignorée par jsonb_populate_recordset (pas d'erreur, perte de donnée
//    silencieuse pour cette colonne).
//  - Une contrainte NOT NULL locale plus stricte que la prod (colonne
//    devenue nullable en prod sans migration correspondante) fait échouer
//    l'INSERT dès qu'une ligne prod contient NULL sur cette colonne.
// -> Toujours lancer schema_diff.mjs avant ce script.
//
// Usage : node json_to_sql.mjs <fichier_entree.txt> <fichier_sortie.sql>
import { readFileSync, writeFileSync } from 'fs';

const [, , inFile, outFile] = process.argv;
const raw = JSON.parse(readFileSync(inFile, 'utf-8'));
const out = raw.rows[0].out; // { table_name: [ {...}, {...} ] | null, ... }

let sql = '';
let total = 0;
for (const [table, rows] of Object.entries(out)) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) continue;
  const tag = `$json_${table}$`;
  sql += `INSERT INTO public."${table}" SELECT * FROM jsonb_populate_recordset(null::public."${table}", ${tag}${JSON.stringify(rows)}${tag}::jsonb) ON CONFLICT DO NOTHING;\n`;
  total += rows.length;
}
writeFileSync(outFile, sql);
console.log(`OK: ${Object.keys(out).length} table(s) dans l'entrée, ${total} ligne(s) écrites -> ${outFile}`);
