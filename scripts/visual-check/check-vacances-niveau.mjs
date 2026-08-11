// Vérification visuelle du correctif "Cours de vacances filtrable par niveau"
// (session du 10/08/2026 : ajout de vacances_classes.cycle_id, migration
// 20260810200000_vacances_classes_cycle_id.sql).
//
// Fenêtre Chromium VISIBLE et ralentie (headless: false + slowMo), pilotée
// par Playwright — même approche que scripts/visual-check/check.mjs et
// check-impression-caisse.mjs, réutilisée ici car ni l'extension Claude in
// Chrome ni le contrôle d'écran ne sont disponibles dans cette session.
//
// Ce que le script vérifie, dans l'ordre :
//   1. Avant toute modification : sur la page Bilan comptable
//      (/finances/bilan), le total "Cours de vacances" doit être identique
//      quel que soit le niveau sélectionné (Tous / Primaire / Secondaire),
//      puisqu'aucune classe de vacances n'a de niveau assigné par défaut.
//   2. Sur /cours-vacances/classes : ouvre la première classe, lui assigne
//      un niveau "Secondaire" (option dont le nom contient
//      secondaire/collège/lycée — même logique que niveauOfCycle() côté
//      client), et enregistre.
//   3. Revient sur le Bilan comptable : le total "Cours de vacances" sous
//      "Secondaire" doit avoir augmenté (ou être devenu non nul), et
//      Tous ≈ Primaire + Secondaire pour cette ligne.
//   4. Remet la classe modifiée sur "Commune" pour ne pas laisser les
//      données de test locales dans un état différent de l'état initial.
//
// Toute divergence est un ECHEC explicite (pas un simple constat visuel) :
// utile pour ré-exécuter ce test après un futur changement sans dépendre
// d'une relecture humaine de captures d'écran.
//
// Pré-requis : serveur de dev lancé (`npm run dev`), LOCAL_TEST_EMAIL /
// LOCAL_TEST_PASSWORD définis dans .env.local (voir scripts/db-sync/README.md
// étape 5), et au moins une classe de vacances existante en base locale.
//
// Usage : node scripts/visual-check/check-vacances-niveau.mjs
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

const parseMontant = (txt) => {
  const cleaned = (txt || '').replace(/[^\d-]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

async function selectNiveau(page, label) {
  const trigger = page.getByRole('combobox', { name: 'Niveau' });
  await trigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: new RegExp(`^${label}`, 'i') }).click();
  await page.waitForTimeout(2000);
}

async function readCoursVacancesTotal(page) {
  const row = page.locator('tr').filter({ has: page.locator('td', { hasText: 'Cours de vacances' }) });
  if (!(await row.count())) return null;
  const total = await row.locator('td').last().innerText();
  return parseMontant(total);
}

const errors = [];
const check = (label, cond) => {
  console.log(`${cond ? 'OK ' : 'ECHEC '} ${label}`);
  if (!cond) errors.push(label);
};

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: null });
page.on('pageerror', (e) => errors.push(`Erreur JS page : ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`Console error : ${m.text()}`);
});

try {
  // ── Connexion ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill(EMAIL);
  await page.getByPlaceholder('Entrez votre mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // ── Étape 1 : totaux "avant" sur le Bilan comptable ──
  await page.goto(`${BASE}/finances/bilan`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await selectNiveau(page, 'Tous');
  const avantTous = await readCoursVacancesTotal(page);
  await selectNiveau(page, 'Primaire');
  const avantPrimaire = await readCoursVacancesTotal(page);
  await selectNiveau(page, 'Secondaire');
  const avantSecondaire = await readCoursVacancesTotal(page);

  console.log(`Avant modification — Cours de vacances : Tous=${avantTous} Primaire=${avantPrimaire} Secondaire=${avantSecondaire}`);
  check(
    'Avant modification : le total est identique quel que soit le niveau (aucune classe assignée)',
    avantTous === avantPrimaire && avantPrimaire === avantSecondaire,
  );

  // ── Étape 2 : assigner un niveau "Secondaire" à la 1re classe de vacances ──
  await selectNiveau(page, 'Tous'); // revenir en vue globale avant de changer de module
  await page.goto(`${BASE}/cours-vacances/classes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const premiereLigne = page.locator('table tbody tr').first();
  const nomClasse = await premiereLigne.locator('td').first().innerText();
  console.log(`Classe utilisée pour le test : "${nomClasse}"`);

  await premiereLigne.locator('button').first().click(); // crayon = édition
  await page.waitForTimeout(500);

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').click();
  await page.waitForTimeout(300);
  const optionSecondaire = page.getByRole('option', { name: /second|coll|lyc/i }).first();
  const aUneOptionSecondaire = await optionSecondaire.count();
  if (!aUneOptionSecondaire) {
    console.log('ECHEC : aucun cycle "Secondaire/Collège/Lycée" trouvé dans le sélecteur de niveau — test interrompu.');
    errors.push('Aucune option de cycle secondaire disponible pour le test');
  } else {
    await optionSecondaire.click();
    await page.waitForTimeout(300);
    await dialog.getByRole('button', { name: /Enregistrer/i }).click();
    await page.waitForTimeout(1000);

    // ── Étape 3 : totaux "après" ──
    await page.goto(`${BASE}/finances/bilan`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await selectNiveau(page, 'Tous');
    const apresTous = await readCoursVacancesTotal(page);
    await selectNiveau(page, 'Primaire');
    const apresPrimaire = await readCoursVacancesTotal(page);
    await selectNiveau(page, 'Secondaire');
    const apresSecondaire = await readCoursVacancesTotal(page);

    console.log(`Après modification — Cours de vacances : Tous=${apresTous} Primaire=${apresPrimaire} Secondaire=${apresSecondaire}`);
    // NB sémantique (déjà établie ailleurs dans ce projet, ex. depenses.cycle_id) :
    // une ligne "Commune" (cycle_id NULL) est comptée dans TOUS les niveaux, pas
    // seulement dans "Tous". Avant le test, la classe était Commune : son montant
    // était donc déjà inclus dans le total Secondaire. Après reclassement, il y
    // reste inclus (désormais directement, plus via Commune) : Secondaire ne doit
    // donc PAS forcément augmenter. Primaire, en revanche, doit baisser puisque la
    // classe reclassée n'est plus Commune et ne correspond pas à ce niveau.
    check('Après modification : Tous inchangé (aucune donnée perdue)', apresTous === avantTous);
    check('Après modification : Primaire a baissé (la classe reclassée n\'y est plus incluse)', apresPrimaire < avantPrimaire);
    check('Après modification : Secondaire inchangé (déjà inclus via "Commune" avant, inclus directement après)', apresSecondaire === avantSecondaire);
    check('Le filtre a un effet réel et non nul (le niveau ne peut plus ignorer cette ligne)', avantPrimaire - apresPrimaire > 0);

    // ── Étape 4 : remettre la classe sur "Commune" (ne pas polluer les données de test) ──
    await selectNiveau(page, 'Tous');
    await page.goto(`${BASE}/cours-vacances/classes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('table tbody tr').first().locator('button').first().click();
    await page.waitForTimeout(500);
    await dialog.getByRole('combobox').click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /^Commune/i }).click();
    await page.waitForTimeout(300);
    await dialog.getByRole('button', { name: /Enregistrer/i }).click();
    await page.waitForTimeout(800);
    console.log('Classe de test remise sur "Commune" (nettoyage).');
  }

  console.log('\n' + (errors.length === 0 ? `TOUT EST BON (${nomClasse})` : `${errors.length} ECHEC(S) :`));
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
