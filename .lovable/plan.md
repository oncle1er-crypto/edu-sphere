# Zindua WhatsApp — état réel et plan pour activer l'envoi

## Réponse courte

Non, pas encore. La plomberie Zindua est en place, mais elle ne sert aujourd'hui qu'à **un seul cas d'usage** (le code de vérification à deux facteurs), elle est **en mode test** (un seul numéro autorisé), et **aucun message WhatsApp n'a encore été envoyé** depuis l'application.

## Ce qui est déjà fait

- Client serveur Zindua (`_shared/zindua-client.ts`) : appel HTTPS sécurisé, gestion des erreurs et des délais.
- Clé `ZINDUA_API_KEY` bien enregistrée côté serveur.
- Configuration en base (`zindua_config`) : Zindua activé, canal WhatsApp activé, modèle `otp-verification`, quota 200/mois, cadence 15 s.
- Garde-fous serveur (`zindua_verifier_envoi`) : quota, cadence, mode test.
- Écran de réglages « Fournisseurs de notifications » pour piloter tout ça.
- Repli automatique vers SMS (YellikaSMS) si WhatsApp échoue.

## Ce qui bloque l'envoi réel aujourd'hui

1. **Mode test actif** : seul le numéro `+225 07 08 42 91 81` peut recevoir un message. Tout autre destinataire est refusé (`destinataire_non_autorise_en_test`).
2. **Un seul type de message** : Zindua n'est appelé que par la fonction d'OTP. Les bulletins, relances d'impayés et rappels d'échéance passent encore par YellikaSMS (`send-sms` / `send-whatsapp`), pas par Zindua.
3. **Zéro envoi observé** : l'historique des envois ne contient que des SMS YellikaSMS (36 échecs, 14 succès), aucune ligne `zindua`. Le lien avec le compte WhatsApp Business de Zindua n'a donc jamais été validé en conditions réelles.
4. **Aucun test manuel possible depuis l'interface** : pas de bouton « Envoyer un message de test ».

## Plan proposé

### Étape 1 — Valider la connexion pour de vrai (indispensable)
- Ajouter un bouton **« Envoyer un test WhatsApp »** dans « Fournisseurs de notifications », limité aux destinataires de test.
- Afficher le résultat exact renvoyé par Zindua (par ex. « WhatsApp non connecté », « modèle introuvable », « quota dépassé ») en français clair.
- Objectif : confirmer que le compte WhatsApp est bien relié chez Zindua et que le modèle existe.

### Étape 2 — Une fonction d'envoi WhatsApp générique via Zindua
- Nouvelle fonction serveur `send-whatsapp-zindua` : destinataires multiples, modèle + variables, respect du mode test, du quota et de la cadence, journalisation dans l'historique, repli SMS si échec.
- Rendre l'appel réutilisable par tous les modules.

### Étape 3 — Brancher les usages métier
- Relances d'impayés cantine/transport : WhatsApp d'abord, SMS en repli.
- Rappels d'échéance d'abonnement.
- Envoi des bulletins (remplacer le chemin YellikaSMS par Zindua avec repli).
- Chaque canal reste activable/désactivable depuis les réglages.

### Étape 4 — Passage en production
- Bouton clair « Quitter le mode test » avec avertissement (quota consommé, envois réels).
- Suivi visible : envoyés / échoués / quota restant du mois, avec le motif d'échec.

## Détails techniques

- Modèles Zindua : chaque type de message a besoin de son propre modèle approuvé côté Zindua. Prévoir des champs de configuration `template_relance`, `template_echeance`, `template_bulletin` en plus de `template_otp`.
- `zindua_verifier_envoi` sera étendue pour accepter un paramètre de canal/modèle plutôt que de retourner uniquement `template_otp`.
- Journalisation : réutiliser `sms_logs` avec `provider = 'zindua'`, `canal = 'whatsapp'`, `template_slug`, `error_code`.
- Sécurité : la clé API reste exclusivement côté serveur ; aucun appel Zindua depuis le navigateur.

## Point confirmé

Le compte WhatsApp Business est déjà connecté chez Zindua et le modèle est validé. L'étape 1 sert donc uniquement à confirmer le lien technique depuis l'application, puis on enchaîne directement sur les étapes 2 à 4.
