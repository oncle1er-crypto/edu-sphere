import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  const failures: string[] = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith('.supabase.co')) {
      failures.push(`Supabase distant : ${url.origin}`);
      await route.abort();
    } else await route.continue();
  });
  page.on('console', msg => { if (msg.type() === 'error') failures.push(msg.text()); });
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(`Réseau : ${request.url()}`));
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()} : ${response.url()}`); });
  test.info().annotations.push({ type: 'network-audit', description: 'Écoute installée avant navigation' });
  // Vérification dans afterEach, y compris en cas d'erreur de navigation.
  audits.set(page, failures);
});
const audits = new WeakMap<object, string[]>();
test.afterEach(async ({ page }) => { expect(audits.get(page)).toEqual([]); });

test.describe('Smoke Tests - Application Launch', () => {
  test('should load the application successfully', async ({ page }) => {
    // Navigate to the home page and check the real HTTP status
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    // Wait for the app to be ready
    await page.waitForLoadState('networkidle');

    // Check no critical console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any startup errors
    await page.waitForTimeout(2000);

    // Should not have critical errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error promise rejection')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('should have no network errors on load', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', response => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(failedRequests).toEqual([]);
  });

  test('should display main content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that page has some content
    const main = page.locator('main, [role="main"], body > div');
    await expect(main).toBeTruthy();

    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(100);
  });
});
