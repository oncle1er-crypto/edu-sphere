# Vérification visuelle en direct

Ouvre une vraie fenêtre de navigateur (Chromium, via Playwright — déjà une
dépendance du projet) sur l'écran de la machine qui exécute le script,
navigue automatiquement jusqu'à l'écran demandé, et la laisse ouverte 20
secondes pour observation.

À utiliser quand ni l'extension Claude in Chrome ni le contrôle d'écran ne
sont disponibles, mais qu'une vérification visuelle réelle (pas seulement
du code ou des captures a posteriori) est nécessaire avant de committer/
pousser un correctif d'interface.

## Pré-requis

1. Le serveur de dev doit tourner : `npm run dev`.
2. Un compte de test local doit exister, avec ses identifiants dans
   `.env.local` (fichier gitignored — ne jamais committer de mot de passe) :

   ```
   LOCAL_TEST_EMAIL="test.local@laprovidence.dev"
   LOCAL_TEST_PASSWORD="..."
   ```

   Ce compte doit être recréé après chaque `supabase db reset` — voir
   `scripts/db-sync/README.md`, étape 5, pour la procédure.

## Usage

```sh
node scripts/visual-check/check.mjs [route] [niveau]

# Exemples
node scripts/visual-check/check.mjs /finances/depenses
node scripts/visual-check/check.mjs /finances/bilan Primaire
node scripts/visual-check/check.mjs                        # défaut : /
```

Le paramètre `niveau` (optionnel) sélectionne une valeur dans le sélecteur
"Niveau" de l'en-tête (Primaire / Secondaire / Tous les niveaux) si présent
sur l'écran visité — sinon il est ignoré.
