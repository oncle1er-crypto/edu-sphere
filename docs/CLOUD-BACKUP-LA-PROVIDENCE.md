# Sauvegarde Cloud quotidienne — La Providence

Cette automatisation copie chaque jour à **20:00 (Africa/Abidjan, UTC+0)** les données de production vers un bucket privé Cloudflare R2, même lorsque le Mac est éteint.

## Contenu sauvegardé

- schémas, fonctions, triggers et données PostgreSQL via `pg_dump`;
- fichiers de tous les buckets Supabase Storage;
- manifeste SHA-256 permettant de vérifier les fichiers;
- rapport JSON de chaque exécution.

Les sessions, jetons de rafraîchissement et secrets MFA des utilisateurs sont volontairement exclus. Les mots de passe Supabase ne sont pas exportables en clair. Tout le reste est copié aussi fidèlement que PostgreSQL et l'API Storage le permettent.

Chaque contenu est chiffré en AES-256-GCM **avant** son transfert. R2 applique aussi son chiffrement côté serveur. Le bucket ne doit jamais être rendu public.

## Activation unique

### 1. Cloudflare R2

1. Ouvrir **Cloudflare → R2 Object Storage** et activer R2.
2. Créer le bucket privé `ecf-la-providence-backups` s'il n'existe pas.
3. Dans **Manage R2 API Tokens**, créer un jeton limité à ce bucket avec lecture/écriture.
4. Copier immédiatement l'Access Key ID et la Secret Access Key.

### 2. Secrets GitHub

Dans **GitHub → oncle1er-crypto/edu-sphere → Settings → Environments**, créer l'environnement `production-backup`. Dans ses secrets, ajouter:

| Secret | Valeur |
|---|---|
| `LOVABLE_DB_URL` | URL PostgreSQL directe de la production Lovable/Supabase |
| `LOVABLE_SUPABASE_URL` | URL API du projet, par exemple `https://….supabase.co` |
| `LOVABLE_SERVICE_ROLE_KEY` | clé service_role du projet de production |
| `R2_ACCESS_KEY_ID` | identifiant du jeton R2 limité au bucket |
| `R2_SECRET_ACCESS_KEY` | secret du jeton R2 |
| `BACKUP_ENCRYPTION_KEY_B64` | clé aléatoire de 32 octets encodée en Base64 |

Générer la clé de chiffrement sur un poste sûr:

```bash
openssl rand -base64 32
```

Conserver une seconde copie de cette clé dans un gestionnaire de mots de passe. Sans elle, les sauvegardes sont volontairement illisibles. Ne jamais la placer dans le dépôt, un ticket ou une capture d'écran.

### 3. Activer le workflow

Fusionner la branche `agent/cloud-backup-r2` dans `main`. Puis ouvrir **Actions → Sauvegarde Cloud La Providence → Run workflow** pour le premier test.

## Contrôle quotidien

La page **Actions** montre immédiatement:

- jaune: en cours;
- vert: copie réussie;
- rouge: échec, avec l'étape exacte et un résumé.

Les sauvegardes automatiques ne modifient ni ne suppriment la production. Les fichiers Storage identiques ne sont pas renvoyés, ce qui limite le coût. Les sauvegardes PostgreSQL quotidiennes sont conservées 14 jours; les rapports et manifestes 30 jours. Le miroir Storage conserve la dernière version copiée.

## Arrêter ou reprendre

Dans **Actions → Sauvegarde Cloud La Providence**, choisir **Disable workflow**. Les sauvegardes déjà présentes dans R2 restent intactes. **Enable workflow** réactive la planification.

## Test de restauration

Une sauvegarde n'est validée qu'après un test de restauration:

1. télécharger l'objet `database/daily/<date>.dump.enc` depuis R2;
2. le déchiffrer avec la clé conservée;
3. restaurer le dump dans une base Supabase locale de test avec `pg_restore`;
4. télécharger et déchiffrer les objets sous `storage/current/`;
5. comparer les SHA-256 avec le manifeste du même jour;
6. lancer l'application locale, les tests métier et Playwright.

Ne jamais effectuer ce test directement sur la production.

## Limites importantes

Cette sauvegarde protège la base PostgreSQL et Storage. Les réglages externes non stockés dans PostgreSQL — secrets de déploiement, DNS, intégrations tierces, historique Lovable, journaux et configuration du fournisseur — doivent être documentés séparément.
