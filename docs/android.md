

## Mises à jour des APK installés

Le menu du profil Android propose « Vérifier les mises à jour ». Le manifeste HTTPS `/android/latest.json` doit être publié sur le site La Providence avec l’APK correspondant. Le téléchargement est ouvert dans le navigateur ; Android demande confirmation de l’installation. Aucun remplacement silencieux et aucune mise à jour automatique du code embarqué ne sont effectués. Une absence de manifeste ne signifie pas que l’application est à jour.

La clé permanente doit être sauvegardée hors du dépôt et les quatre secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` configurés dans GitHub Actions. Le workflow manuel `android-release.yml`, exécuté sur main, vérifie la signature et génère un APK et un AAB signés. Il refuse les versions invalides et les codes inférieurs ou égaux à la dernière publication. Première version prévue : 1.0.3, code 4.

Le workflow propose une PR contenant le manifeste et l’APK. GitHub Actions doit être autorisé à créer des PR ; sinon récupérer son artefact et préparer la PR manuellement. Après revue/fusion, publier le projet Lovable La Providence puis vérifier le manifeste, le téléchargement et l’installation sur un appareil avant d’annoncer la disponibilité. La publication GitHub seule ne prouve pas la publication Lovable.

Les anciennes versions debug ayant d’autres certificats, la première installation signée peut nécessiter de désinstaller la version de test après vérification de la synchronisation des données. Les versions suivantes doivent conserver la même signature. La configuration Firebase pour les notifications reste indépendante.
