// Vérification visuelle de la nouvelle fonctionnalité d'impression "Liste des
// élèves par classe" (module Élèves), ajoutée le 11/08/2026.
//
// Fenêtre Chromium visible et ralentie — même approche que les autres scripts
// de scripts/visual-check/. Purement en LECTURE (aucune donnée modifiée).
//
// Vérifie :
//   1. Page Élèves : le bouton "Aperçu" ouvre une prévisualisation PDF (iframe
//      avec une URL blob:), sans erreur JS console.
//   2. Page Classes > "Voir les élèves" d'une classe : le bouton "Aperçu"
//      fonctionne de la même façon, scopé à une seule classe.
//
// Usage : node scripts/visual-check/check-liste-eleves-classe.mjs
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

const browser = await chromium.launch({ headless: false, slowMo: 250 });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => errors.push(`Erreur JS page : ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`Console error : ${m.text()}`); });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill(EMAIL);
  await page.getByPlaceholder('Entrez votre mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // ── 1. Module Élèves : liste globale ──
  await page.goto(`${BASE}/eleves/liste`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const apercuBtn = page.getByRole('button', { name: /^Aperçu$/i }).first();
  check('Bouton "Aperçu" visible sur la liste des élèves', await apercuBtn.count() > 0);
  await apercuBtn.click();
  await page.waitForTimeout(2000);

  const iframeGlobal = page.locator('iframe[title="Aperçu de la liste des élèves"]');
  check('Dialogue d\'aperçu PDF (toutes classes) ouverte', await iframeGlobal.count() > 0);
  if (await iframeGlobal.count() > 0) {
    const src = await iframeGlobal.getAttribute('src');
    check('Le PDF généré est bien un blob local (pas d\'erreur réseau)', !!src && src.startsWith('blob:'));
  }
  // Fermer la dialogue (Echap)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── 2. Module Classes : "Voir les élèves" d'une classe ──
  await page.goto(`${BASE}/classes/liste`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Cible une classe connue pour avoir des élèves (CE1, déjà utilisée dans
  // check-vacances-niveau.mjs) plutôt que la première ligne, qui peut être vide.
  await page.getByPlaceholder('Nom, prof. principal...').fill('CE1');
  await page.waitForTimeout(500);

  // Ouvre le menu contextuel de la classe filtrée et clique "Voir les élèves"
  const firstRowMenuBtn = page.locator('table tbody tr').first().getByRole('button').last();
  await firstRowMenuBtn.click();
  await page.waitForTimeout(300);
  const voirElevesItem = page.getByText('Voir les élèves', { exact: true });
  check('Item de menu "Voir les élèves" présent', await voirElevesItem.count() > 0);
  await voirElevesItem.click();
  await page.waitForTimeout(800);

  const classeApercuBtn = page.getByRole('dialog').getByRole('button', { name: /^Aperçu$/i });
  const hasEleves = await classeApercuBtn.count() > 0;
  check('Bouton "Aperçu" présent dans la dialogue "Voir les élèves" (classe non vide)', hasEleves);
  if (hasEleves) {
    await classeApercuBtn.click();
    await page.waitForTimeout(2000);
    const iframeClasse = page.locator('iframe[title="Aperçu de la liste des élèves"]');
    check('Dialogue d\'aperçu PDF (une classe) ouverte', await iframeClasse.count() > 0);
  } else {
    console.log('   (classe vide ou sans élève actif — test du bouton Aperçu ignoré pour cette classe)');
  }

  console.log('\n' + (errors.length === 0 ? 'TOUT EST BON' : `${errors.length} ECHEC(S) :`));
  errors.forEach((e) => console.log(' - ' + e));
  console.log('Fenêtre laissée ouverte 10s pour observation.');
  await page.waitForTimeout(10000);
} catch (err) {
  console.error('ECHEC (exception) :', err.message);
  errors.push(err.message);
} finally {
  await browser.close();
  process.exitCode = errors.length > 0 ? 1 : 0;
}
