import { Page, expect } from '@playwright/test';

/**
 * Identifiants du compte de test local (voir scripts/db-sync/README.md
 * étape 5 et scripts/visual-check/check.mjs qui utilise le même compte).
 * Chargés depuis .env.local par playwright.config.ts.
 */
export const LOCAL_TEST_EMAIL = process.env.LOCAL_TEST_EMAIL;
export const LOCAL_TEST_PASSWORD = process.env.LOCAL_TEST_PASSWORD;

/** Se connecte avec le compte de test local et attend d'arriver sur le tableau de bord. */
export async function loginAsTestUser(page: Page) {
  await page.goto('/connexion');
  await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill(LOCAL_TEST_EMAIL!);
  await page.getByPlaceholder('Entrez votre mot de passe').fill(LOCAL_TEST_PASSWORD!);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  // Sort de la page de connexion (redirection vers "/" ou un ?next= géré ailleurs).
  await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}
