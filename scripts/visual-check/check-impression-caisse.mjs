// Vérification visuelle ciblée du bouton "Imprimer le récapitulatif du jour"
// (modale "Encaissements du jour", page d'accueil) : ouvre une fenêtre
// Chromium VISIBLE et ralentie (headless: false + slowMo), se connecte,
// ouvre la modale, clique sur "Imprimer", et confirme que le téléchargement
// du PDF se déclenche sans erreur JS console.
//
// Complète scripts/visual-check/check.mjs (générique route+niveau) par un
// parcours interactif spécifique à cette fonctionnalité. Mêmes pré-requis :
// serveur de dev lancé (`npm run dev`) et LOCAL_TEST_EMAIL/LOCAL_TEST_PASSWORD
// dans .env.local.
//
// Usage : node scripts/visual-check/check-impression-caisse.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

function loadEnvLocal(path) {
  let content;
  try {
    content = readFileSync(path, 'utf-8');
  } catch {
    return;
  }
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
  console.error(
    "Variables LOCAL_TEST_EMAIL / LOCAL_TEST_PASSWORD absentes de .env.local.\n" +
    "Voir scripts/db-sync/README.md étape 5.",
  );
  process.exit(1);
}

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: null });

const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push(String(err)));

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill(EMAIL);
  await page.getByPlaceholder('Entrez votre mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  console.log('Ouverture de la modale "Encaissements du jour"...');
  await page.getByText('Encaissé aujourd\'hui').click();
  await page.waitForTimeout(1000);

  const dialog = page.getByRole('dialog');
  const printBtn = dialog.getByRole('button', { name: /Imprimer le récapitulatif du jour/i });
  await printBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Bouton "Imprimer" visible. Clic...');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    printBtn.click(),
  ]);
  const suggested = download.suggestedFilename();
  const savePath = `/tmp/${suggested}`;
  await download.saveAs(savePath);
  console.log(`OK: PDF téléchargé -> ${savePath}`);

  if (consoleErrors.length > 0) {
    console.log('⚠ Erreurs console JS détectées pendant le parcours :');
    consoleErrors.forEach((e) => console.log('  -', e));
  } else {
    console.log('OK: aucune erreur console JS détectée.');
  }

  console.log('Fenêtre laissée ouverte 15s pour observation.');
  await page.waitForTimeout(15000);
} catch (err) {
  console.error('ECHEC:', err.message);
  if (consoleErrors.length > 0) {
    console.log('Erreurs console JS collectées avant l\'échec :');
    consoleErrors.forEach((e) => console.log('  -', e));
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
