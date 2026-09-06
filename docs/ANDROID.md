# Application Android — La Providence

## Identité

- Nom affiché : **La Providence**
- Identifiant Android : **ci.ecftech.edusphere**
- Android minimum : Android 7 (API 24)
- Cible Google Play : Android 16 (API 36)

## Compiler en local

Prérequis : Node.js 22, Java 21 et Android SDK API 36.

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

L'APK de test est créé dans `android/app/build/outputs/apk/debug/`.
Les icônes et écrans de démarrage sont régénérés automatiquement depuis `public/logo-gsp.png` à chaque synchronisation.

## Activer les notifications Android

1. Créer ou ouvrir le projet Firebase correspondant à **La Providence**.
2. Ajouter une application Android avec l'identifiant exact `ci.ecftech.edusphere`.
3. Télécharger `google-services.json`.
4. Pour un test local uniquement, placer ce fichier dans `android/app/google-services.json`.
5. Dans GitHub, enregistrer sa version Base64 dans le secret `GOOGLE_SERVICES_JSON_BASE64`.
6. Appliquer la migration Supabase `20260906120000_android_notification_devices.sql`.

Le fichier Firebase est un secret de configuration : il est ignoré par Git et ne doit jamais être commité.

## Produire l'APK et l'AAB signés

Conserver la clé d'envoi Google Play dans un coffre sécurisé. La perte de cette clé complique les futures mises à jour.

Configurer ces secrets GitHub :

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Lancer ensuite le workflow **Android — APK et AAB** depuis l'onglet Actions. Il produit :

- `la-providence-release.apk` pour installation directe ;
- `la-providence-release.aab` pour Google Play.

Sans clé de signature, le workflow fournit uniquement un APK de vérification et un AAB explicitement marqué non signé, inutilisable pour une publication Google Play.
