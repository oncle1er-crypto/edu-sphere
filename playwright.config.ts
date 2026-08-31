import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';

/**
 * Charge UNIQUEMENT .env.local (stack Supabase locale), jamais .env (config
 * de production, suivie par Git) : les tests E2E ne doivent jamais pouvoir
 * pointer accidentellement vers la production. Parseur minimal volontaire
 * (pas de dépendance `dotenv` ajoutée pour ça) : lignes `CLE="valeur"`.
 */
function loadEnvLocal(path: string) {
  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch {
    return; // fichier absent (ex: environnement CI) : pas bloquant
  }
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvLocal('.env.local');

/**
 * Garde-fou de sécurité : quelle que soit la source (fichier .env.local,
 * variables d'environnement CI, export shell...), on refuse de lancer la
 * moindre suite Playwright si VITE_SUPABASE_URL ne pointe pas vers une
 * instance Supabase locale. Certains specs écrivent/suppriment de vraies
 * lignes via l'API REST (voir tests/e2e/paiements-annulation-solde.spec.ts) :
 * une exécution accidentelle contre la production serait destructrice.
 */
function assertSupabaseUrlIsLocal() {
  const url = process.env.VITE_SUPABASE_URL;
  if (!url) return; // pas de config Supabase : rien à vérifier ici.
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/i.test(url);
  if (!isLocal) {
    throw new Error(
      `Garde-fou sécurité : VITE_SUPABASE_URL ("${url}") ne pointe pas vers une instance Supabase locale ` +
        `(127.0.0.1 / localhost attendu). Les tests Playwright ne doivent JAMAIS s'exécuter contre une base ` +
        `distante ou de production. Vérifie .env.local ou les secrets/variables du workflow CI.`
    );
  }
}
assertSupabaseUrlIsLocal();

/**
 * Utilise un port dédié aux E2E afin de ne jamais réutiliser par accident un
 * serveur de développement (ou un conteneur Docker) déjà présent sur 8080.
 * La réutilisation reste possible, mais uniquement sur demande explicite.
 */
const e2ePortValue = process.env.PLAYWRIGHT_PORT ?? '18080';
if (!/^\d+$/.test(e2ePortValue)) {
  throw new Error(`PLAYWRIGHT_PORT invalide : "${e2ePortValue}" (nombre attendu).`);
}
const e2ePort = Number(e2ePortValue);
if (e2ePort < 1024 || e2ePort > 65535) {
  throw new Error(`PLAYWRIGHT_PORT invalide : ${e2ePort} (1024-65535 attendu).`);
}
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === '1';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /*
   * Les parcours UI partagent le même compte technique. Le test de
   * déconnexion révoque ses sessions globalement et rend donc une exécution
   * multi-worker non déterministe (les autres parcours sont déconnectés en
   * plein test). Un worker unique reproduit localement le comportement CI.
   */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: e2eBaseUrl,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
    reuseExistingServer,
    timeout: 120000,
  },
});
