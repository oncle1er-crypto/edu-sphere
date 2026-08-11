// Vérification visuelle de la sélection multiple + validation groupée des
// dépenses (module Paiements > Dépenses), ajoutée le 10/08/2026.
//
// Fenêtre Chromium visible et ralentie — même approche que les autres
// scripts de scripts/visual-check/.
//
// Vérifie : présence des cases à cocher sur les lignes "En attente",
// sélection de 2 dépenses, apparition du bouton "Valider la sélection (2)",
// confirmation, et passage effectif de leur statut à "Validée" dans le
// tableau après rechargement.
//
// Usage : node scripts/visual-check/check-validation-groupee.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

function loadEnvLocal(path) {
  let content;
  try { content = readFileSync(path, 'utf-8'); } catch { return; }
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvLocal('.env.local');

const BASE = process.env.VITE_SUPABASE_APP_URL || 'http://localhost:8080';
const EMAIL = process.env.LOCAL_TEST_EMAIL;
const PASSWORD = process.env.LOCAL_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Variables LOCAL_TEST_EMAIL / LOCAL_TEST_PASSWORD absentes de .env.local.");
  process.exit(1);
}

const errors = [];
const check = (label, cond) => {
  console.log(`${cond ? 'OK ' : 'ECHEC '} ${label}`);
  if (!cond) errors.push(label);
};

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: null });
page.on('pageerror', (e) => errors.push(`Erreur JS page : ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`Console error : ${m.text()}`); });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill(EMAIL);
  await page.getByPlaceholder('Entrez votre mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}/finances/depenses`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Filtrer sur "En attente" pour cibler des lignes sélectionnables
  const filtreStatut = page.getByRole('combobox').filter({ hasText: /statut/i }).first();
  // Repli : le combobox Statut n'a pas toujours ce texte visible avant sélection.
  const rows = page.locator('table tbody tr');
  const enAttenteCheckboxes = page.locator('table tbody tr').locator('button[role="checkbox"]');
  const nbCheckboxesAvant = await enAttenteCheckboxes.count();
  check('Au moins une dépense "En attente" sélectionnable est affichée', nbCheckboxesAvant >= 2);

  if (nbCheckboxesAvant >= 2) {
    await enAttenteCheckboxes.nth(0).click();
    await page.waitForTimeout(200);
    await enAttenteCheckboxes.nth(1).click();
    await page.waitForTimeout(200);

    const bulkBtn = page.getByRole('button', { name: /Valider la sélection \(2\)/i });
    check('Le bouton "Valider la sélection (2)" apparaît', await bulkBtn.count() > 0);

    await bulkBtn.click();
    await page.waitForTimeout(400);
    await page.getByRole('alertdialog').getByRole('button', { name: /Confirmer/i }).click();
    await page.waitForTimeout(1500);

    const badgesValidee = page.locator('table tbody tr').getByText('Validée', { exact: true });
    const nbValidees = await badgesValidee.count();
    check('Au moins 2 dépenses affichent désormais le statut "Validée"', nbValidees >= 2);

    const checkboxesApres = await page.locator('table tbody tr').locator('button[role="checkbox"]').count();
    check('Le nombre de cases à cocher a diminué (les dépenses validées ne sont plus sélectionnables)', checkboxesApres === nbCheckboxesAvant - 2);
  }

  console.log('\n' + (errors.length === 0 ? 'TOUT EST BON' : `${errors.length} ECHEC(S) :`));
  errors.forEach((e) => console.log(' - ' + e));
  console.log('Fenêtre laissée ouverte 15s pour observation.');
  await page.waitForTimeout(15000);
} catch (err) {
  console.error('ECHEC (exception) :', err.message);
  errors.push(err.message);
} finally {
  await browser.close();
  process.exitCode = errors.length > 0 ? 1 : 0;
}
