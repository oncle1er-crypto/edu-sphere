/**
 * Parcours CRUD métier de bout en bout sur le module Matières (création,
 * consultation, modification), sur des données créées et nettoyées par le
 * test lui-même (aucune donnée existante n'est modifiée). Sélecteurs vérifiés
 * dans le code réel (src/pages/matieres/sections/SubjectsList.tsx et
 * src/pages/matieres/components/SubjectEditDialog.tsx).
 *
 * Nettoyage : le module n'expose qu'un archivage (pas de suppression
 * définitive) — voir handleArchive dans SubjectsList.tsx — utilisé ici pour
 * ne laisser aucune trace active après le test, sans jamais faire de DELETE.
 */
import { test, expect } from '@playwright/test';
import { loginAsTestUser, LOCAL_TEST_EMAIL, LOCAL_TEST_PASSWORD } from './helpers';

test.skip(!LOCAL_TEST_EMAIL || !LOCAL_TEST_PASSWORD, 'LOCAL_TEST_EMAIL / LOCAL_TEST_PASSWORD absents de .env.local.');

test('création, consultation et modification d\'une matière', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  const nom = `Matière Test E2E ${suffix}`;
  const nomModifie = `${nom} (modifiée)`;
  const code = `E2E${suffix}`;

  // Accepte automatiquement la boîte de confirmation native de l'archivage
  // en fin de test (voir handleArchive -> confirm(...) dans SubjectsList.tsx).
  page.on('dialog', (dialog) => dialog.accept());

  await loginAsTestUser(page);
  await page.goto('/matieres/liste');
  await page.waitForLoadState('networkidle');

  // ---- Création ----
  await page.getByRole('button', { name: 'Nouvelle matière' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Nouvelle matière')).toBeVisible();
  await dialog.locator('input').first().fill(nom); // champ "Nom *", pas de label associé
  await dialog.getByPlaceholder('MATH').fill(code); // champ "Code"
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog).toBeHidden();

  // ---- Consultation ----
  await page.getByPlaceholder('Nom ou code...').fill(nom);
  await expect(page.getByRole('cell', { name: nom })).toBeVisible({ timeout: 10000 });

  // ---- Modification ----
  const row = page.getByRole('row', { name: new RegExp(nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await row.getByRole('button').last().click(); // menu "..." de la ligne
  await page.getByText('Modifier').click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByText('Modifier la matière')).toBeVisible();
  await editDialog.locator('input').first().fill(nomModifie);
  await editDialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(editDialog).toBeHidden();

  await page.getByPlaceholder('Nom ou code...').fill(nomModifie);
  await expect(page.getByRole('cell', { name: nomModifie })).toBeVisible({ timeout: 10000 });

  // ---- Nettoyage (archivage, pas de suppression définitive) ----
  const rowModifiee = page.getByRole('row', { name: new RegExp(nomModifie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await rowModifiee.getByRole('button').last().click();
  await page.getByText('Archiver').click();
  await page.getByPlaceholder('Nom ou code...').fill('');
});
