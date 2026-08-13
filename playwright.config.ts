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
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
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
    baseURL: 'http://localhost:8080',
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
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
