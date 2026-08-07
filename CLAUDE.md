# ECF TECH — Règles permanentes Claude Code

Tu travailles dans un projet appartenant à l'environnement ECF TECH.

## Principe fondamental

LOCAL FIRST.

Toute modification doit être développée et testée localement avant toute opération distante.

## Sécurité production

Considère comme DISTANTE toute ressource contenant :

- *.supabase.co
- Vercel production
- Lovable production
- GitHub main
- API de production

Ne jamais exécuter sans autorisation explicite :

- git push
- git push --force
- supabase db push
- supabase link
- supabase functions deploy
- vercel deploy --prod
- déploiement Lovable
- migration distante
- SQL d'écriture vers une base distante

Avant toute opération importante :

1. identifier le projet ;
2. identifier la branche Git ;
3. identifier l'environnement ;
4. vérifier git status ;
5. déterminer si Supabase est local ou distant.

## Supabase

Le développement doit utiliser Supabase local lorsque le projet utilise Supabase.

URL locale attendue :

http://127.0.0.1:54321

Les migrations doivent pouvoir être rejouées depuis une base vierge.

Validation :

supabase db reset

doit terminer sans erreur.

Ne jamais supprimer RLS ou des contraintes simplement pour contourner une erreur.

## Git

Ne jamais :

- écraser un travail local ;
- utiliser reset --hard sans autorisation ;
- force push ;
- pousser automatiquement sur main.

Toujours vérifier :

git status
git branch
git remote -v

## Qualité

Après une modification significative :

1. lancer le build ;
2. lancer TypeScript/lint si présents ;
3. exécuter les tests disponibles ;
4. utiliser Playwright pour le parcours concerné ;
5. vérifier la console navigateur ;
6. vérifier les erreurs réseau ;
7. vérifier qu'aucun appel accidentel ne part vers la production.

## Fiabilité

Ne jamais inventer :

- table ;
- colonne ;
- fonction ;
- API ;
- règle métier ;
- variable d'environnement.

Toujours vérifier le code, le schéma ou la documentation réellement disponible.

Si une information manque, le signaler.

## Philosophie de modification

Préférer :

- changement minimal ;
- cause racine ;
- code existant ;
- réutilisation ;
- tests.

Éviter :

- refactor massif non demandé ;
- duplication ;
- changement d'architecture injustifié ;
- contournement silencieux d'erreurs.

## Fin d'intervention

Toujours fournir :

- résumé ;
- fichiers modifiés ;
- tests effectués ;
- erreurs restantes ;
- git status ;
- risques éventuels.

Ne jamais pousser ni déployer automatiquement.
