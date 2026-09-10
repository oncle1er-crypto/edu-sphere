# Garder l'en-tête et les menus de module fixes au défilement

## Ce qui ne va pas

- Le bloc du haut (logo « GESTION SCOLAIRE », choix de l'année et du niveau, bandeau bleu avec le nom de l'établissement) devrait rester visible en permanence, mais il part vers le haut quand on fait défiler la page.
- Dans chaque module (Paiements, Élèves, Examens, Cantine…), le menu de gauche défile avec le contenu au lieu de rester en place. Sur téléphone il défile toujours, et sur grand écran l'effet « rester fixe » ne fonctionne pas non plus.

Les deux problèmes viennent de la même cause : le cadre principal de l'application est en « masquage horizontal », ce qui annule silencieusement le comportement « rester collé en haut » de tous les éléments à l'intérieur.

## Ce qui sera fait

1. Corriger le cadre principal pour que le collage fonctionne à nouveau, sans réintroduire de barre de défilement horizontale.
2. Le bloc du haut (en-tête + bandeau de l'établissement) reste visible en haut de l'écran à tout moment, sur téléphone comme sur ordinateur.
3. Le titre de chaque module (ex. « Cartes & Badges ») se cale juste sous ce bloc, quelle que soit la hauteur réelle de l'en-tête (elle change entre téléphone et ordinateur).
4. Le menu latéral d'un module reste fixe pendant que la liste ou le tableau défile. S'il est plus long que l'écran, il défile tout seul, indépendamment de la page.
5. Sur téléphone, le menu latéral s'affiche au-dessus du contenu et reste accessible sans devoir remonter toute la page.

## Détails techniques

- `src/components/AppLayout.tsx` : remplacer `overflow-x-hidden` par `overflow-x-clip` sur le conteneur racine (clip ne crée pas de conteneur de défilement, donc `position: sticky` redevient effectif). Le bloc `sticky top-0 z-40` englobant `AppHeader` + `TopNav` est conservé ; retirer le `sticky top-0` redondant interne à `AppHeader`.
- Publier la hauteur réelle de ce bloc dans une variable CSS `--app-header-h` (ResizeObserver dans `AppLayout`, valeur repli définie dans `src/index.css`).
- `src/index.css` : ajouter une classe utilitaire `.module-sticky-head` (`position: sticky; top: var(--app-header-h); z-index: 20;`) et rendre `.menu-aside` collant à tous les points de rupture : `position: sticky; top: calc(var(--app-header-h) + 0.5rem); max-height: calc(100dvh - var(--app-header-h) - 1rem); overflow-y: auto; overscroll-behavior: contain;`.
- Dans les ~20 layouts de modules (`FinanceLayout`, `StudentsLayout`, `ExamsLayout`, `CardsLayout`, `VacancesLayout`, `SchoolsLayout`, `VieScolaireLayout`, `StatsLayout`, `ClassesLayout`, `SettingsLayout`, `AttendanceLayout`, `SubjectsLayout`, `StaffLayout`, `ServicesPonctuelsLayout`, cantine, transport, bibliothèque, communication, emploi du temps) : remplacer `sticky top-[7.25rem] z-20` par `module-sticky-head`, et retirer les utilitaires `lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto` désormais portés par `.menu-aside` (conserver `self-start`).
- Vérification : `bunx tsgo --noEmit -p tsconfig.app.json`, puis contrôle Playwright avec défilement sur Paiements, Élèves et Examens en vue mobile (393 px) et bureau, captures d'écran avant/après et console sans erreur.
- Aucune modification de base de données, aucun déploiement.
