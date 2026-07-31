# Bouton « Installer » visible + retrait du bandeau MFA

## 1. Bouton d'installation en un clic
- Ajouter `InstallPWAButton` directement dans la barre d'en-tête (`src/components/AppHeader.tsx`), à gauche du menu utilisateur, avec `hideWhenUnsupported` pour qu'il n'apparaisse que si le navigateur propose l'installation.
- Style compact : `size="sm"`, variante accent, libellé « Installer l'app » sur desktop et icône seule sur mobile (le composant gère déjà les deux libellés).
- Le clic déclenche directement le prompt natif d'installation (hook `usePWAInstall` existant) — un seul clic, sur mobile comme sur desktop.
- L'entrée « Installer » du menu déroulant est conservée comme repli.

## 2. Retrait du bandeau rouge MFA
- Supprimer le rendu de `MfaEnforcementBanner` dans `src/components/AppLayout.tsx` (l'import également).
- Le composant reste dans le code (non supprimé), donc réactivable plus tard ; aucune règle de sécurité ni obligation MFA n'est modifiée côté base de données.

## Notes techniques
- Aucun changement de manifest, de service worker ou de logique métier.
- Sur iOS Safari, l'installation reste manuelle (« Sur l'écran d'accueil ») : le bouton se masque automatiquement dans ce cas.
