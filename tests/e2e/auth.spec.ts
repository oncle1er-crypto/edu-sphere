/**
 * Parcours d'authentification critiques : connexion valide, refus d'une
 * connexion invalide, déconnexion. Sélecteurs vérifiés dans le code réel
 * (src/pages/auth/LoginPage.tsx, src/components/AppHeader.tsx) — pas de
 * fonctionnalité inventée.
 */
import { test, expect } from '@playwright/test';
import { loginAsTestUser, LOCAL_TEST_EMAIL, LOCAL_TEST_PASSWORD } from './helpers';

test.describe('Authentification', () => {
  test('refuse une connexion avec des identifiants invalides', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByPlaceholder('Email ou téléphone (10 chiffres)').fill('inexistant@example.com');
    await page.getByPlaceholder('Entrez votre mot de passe').fill('MotDePasseInvalide123!');
    await page.getByRole('button', { name: /Se connecter/i }).click();

    // Doit rester sur la page de connexion (pas de redirection vers l'app).
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/connexion/);
    // Un toast d'erreur (sonner) doit apparaître — "Identifiants incorrects" ou
    // "Erreur" selon le message renvoyé par Supabase (voir LoginPage.tsx).
    await expect(page.getByText(/identifiants incorrects|erreur/i).first()).toBeVisible({ timeout: 5000 });
  });

  test.skip(!LOCAL_TEST_EMAIL || !LOCAL_TEST_PASSWORD, 'LOCAL_TEST_EMAIL / LOCAL_TEST_PASSWORD absents de .env.local.');

  test('une connexion avec des identifiants valides mène au tableau de bord', async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page).not.toHaveURL(/\/connexion/);
    // La page d'accueil affiche le nom de la plateforme (voir AppHeader/Home).
    await expect(page.locator('body')).toContainText(/gestion scolaire/i, { timeout: 10000 });
  });

  test('la déconnexion ramène à la page de connexion', async ({ page }) => {
    await loginAsTestUser(page);

    // Ouvre le menu utilisateur (avatar, en haut à droite) puis clique "Déconnexion".
    // Le bouton déclencheur (AppHeader.tsx) n'a pas de nom accessible propre
    // (icône seule) : on cible via aria-haspopup="menu", ajouté automatiquement
    // par Radix DropdownMenu (le composant utilisé partout dans l'app). Le menu
    // utilisateur est le dernier menu déroulant du header (après le sélecteur
    // d'année scolaire / niveau).
    await page.locator('header [aria-haspopup="menu"]').last().click();
    await page.getByText('Déconnexion').click();

    await expect(page).toHaveURL(/\/connexion/, { timeout: 10000 });
  });
});
