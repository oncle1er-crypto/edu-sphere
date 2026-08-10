// Vérification visuelle réelle d'un ou plusieurs écrans, dans une fenêtre
// Chromium VISIBLE et ralentie (headless: false + slowMo), pilotée par
// Playwright (déjà une dépendance du projet — aucun outil supplémentaire).
//
// Utile quand ni l'extension Claude in Chrome ni le contrôle d'écran ne
// sont disponibles : cette fenêtre s'ouvre réellement sur l'écran de la
// machine qui exécute le script, ce qui permet de suivre le parcours en
// direct plutôt que de se fier uniquement à des captures a posteriori.
//
// Pré-requis : le serveur de dev doit tourner (`npm run dev`), et
// LOCAL_TEST_EMAIL / LOCAL_TEST_PASSWORD doivent être définis dans
// .env.local (compte de test local, recréé après chaque
// `supabase db reset` — voir scripts/db-sync/README.md étape 5).
//
// Usage :
//   node scripts/visual-check/check.mjs [route] [niveau]
//   node scripts/visual-check/check.mjs /finances/bilan Primaire
//   node scripts/visual-check/check.mjs /finances/depenses
//   node scripts/visual-check/check.mjs                    (défaut : /)
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
    "Ajoutez-les (compte de test local, voir scripts/db-sync/README.md étape 5) avant de relancer ce script.",
  );
  process.exit(1);
}

const [, , route = '/', niveau] = process.argv;

const browser = await chromium.launch({ headless: false, slowMo: 350 });
const page = await browser.newPage({ viewport: null });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill(EMAIL);
  await page.getByPlaceholder('Entrez votre mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  if (niveau) {
    const niveauSelect = page.getByRole('combobox', { name: 'Niveau' });
    if (await niveauSelect.count()) {
      await niveauSelect.click();
      await page.waitForTimeout(400);
      await page.getByRole('option', { name: new RegExp(niveau, 'i') }).click();
      await page.waitForTimeout(2500);
    } else {
      console.log(`(pas de sélecteur de niveau sur ${route})`);
    }
  }

  console.log(`OK: ${route}${niveau ? ` (niveau ${niveau})` : ''} — fenêtre laissée ouverte 20s pour observation.`);
  await page.waitForTimeout(20000);
} catch (err) {
  console.error('ECHEC:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
