/**
 * Navigation principale : vérifie que les modules accessibles depuis
 * l'application se chargent réellement une fois connecté, sans erreur HTTP
 * ni page blanche, PLUS que le menu horizontal réellement utilisé par l'app
 * (src/components/TopNav.tsx, monté par src/components/AppLayout.tsx)
 * affiche bien ses liens.
 *
 * Correction du 13/08/2026 (preuve d'exécution réelle Étape 5) : le test
 * "menu latéral" ciblait à l'origine les libellés de src/components/
 * AppSidebar.tsx (Élèves, Enseignants, Classes, Emploi du temps, Paiements &
 * Compta...). Exécution réelle → échec : grep confirme qu'AppSidebar.tsx
 * n'est importé nulle part ailleurs dans src/ (composant mort, jamais monté).
 * Le vrai menu persistant de l'app est TopNav.tsx (5 entrées seulement :
 * Tableau de bord, Écoles, Statistiques, Cours de vacances, Paramètres) ;
 * les autres modules (Élèves, Enseignants, Classes, Emploi du temps,
 * Paiements & Compta, Matières...) restent des routes valides (voir les
 * tests "se charge sans erreur" ci-dessous, tous verts en exécution réelle)
 * mais ne sont accessibles que via les tuiles du tableau de bord, pas un
 * lien de menu permanent. Erreur de test de ma part (fausse hypothèse sur
 * un composant non utilisé), pas un bug applicatif.
 */
import { test, expect } from '@playwright/test';
import { loginAsTestUser, LOCAL_TEST_EMAIL, LOCAL_TEST_PASSWORD } from './helpers';

test.skip(!LOCAL_TEST_EMAIL || !LOCAL_TEST_PASSWORD, 'LOCAL_TEST_EMAIL / LOCAL_TEST_PASSWORD absents de .env.local.');

test.describe('Navigation principale', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  const modules: Array<{ label: string; url: string }> = [
    { label: 'Tableau de bord', url: '/' },
    { label: 'Élèves', url: '/eleves' },
    { label: 'Enseignants', url: '/enseignants' },
    { label: 'Classes', url: '/classes' },
    { label: 'Emploi du temps', url: '/emploi-du-temps' },
    { label: 'Paiements & Compta', url: '/finances' },
    { label: 'Statistiques', url: '/statistiques' },
    { label: 'Paramètres', url: '/parametres' },
  ];

  for (const { label, url } of modules) {
    test(`le module "${label}" (${url}) se charge sans erreur`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status(), `HTTP status pour ${url}`).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      // Ne doit pas tomber sur la page 404 (voir src/pages/NotFound.tsx).
      await expect(page.getByText('404')).toHaveCount(0);
      const bodyText = await page.textContent('body');
      expect(bodyText?.length ?? 0).toBeGreaterThan(50);
    });
  }

  // Libellés réels de TopNav.tsx (navItems), pas d'AppSidebar.tsx (mort).
  // "Écoles", "Statistiques", "Cours de vacances" et "Paramètres" sont
  // filtrés par permission (usePermissions().can(item.module)) : ce test
  // vérifie l'ensemble complet, donc suppose un compte avec ces 4
  // permissions — c'est le cas observé pour LOCAL_TEST_EMAIL en exécution
  // réelle. Si ce compte perd l'une de ces permissions, ce test doit être
  // ajusté en conséquence plutôt que d'être ignoré.
  const topNavLabels = ['Tableau de bord', 'Écoles', 'Statistiques', 'Cours de vacances', 'Paramètres'];

  test('le menu horizontal (TopNav) contient bien ses liens', async ({ page }) => {
    await page.goto('/');
    for (const label of topNavLabels) {
      // exact: true — le tableau de bord affiche aussi des tuiles-raccourcis
      // vers certains modules (ex. une tuile "PARAMÈTRES · Configuration
      // système..."). Sans exact:true, getByRole matche en sous-chaîne et
      // "Paramètres" résout à la fois le lien TopNav ET cette tuile
      // (strict mode violation, confirmé en exécution réelle).
      await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });
});
