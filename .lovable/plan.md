# Reçu de paiement envoyé automatiquement par WhatsApp

Oui, c'est possible. Avec Zindua/WhatsApp on ne peut pas joindre un PDF librement : on envoie un **modèle approuvé** contenant un **lien sécurisé** vers le reçu PDF. Le parent clique et télécharge son reçu. C'est le même principe que celui déjà utilisé pour l'envoi des bulletins (upload PDF + lien signé).

## Ce que vivra l'utilisateur

1. La caisse enregistre un encaissement (scolarité, cantine, transport, services ponctuels).
2. Le reçu PDF est généré comme aujourd'hui, puis déposé dans un espace privé et un lien valable 30 jours est créé.
3. Un message WhatsApp partant du modèle « reçu de paiement » est envoyé au parent : nom de l'élève, montant, référence, lien du reçu.
4. Si WhatsApp échoue (numéro non joignable, quota, modèle indisponible), repli automatique en SMS avec le même lien.
5. Un interrupteur dans Paramètres → Notifications permet d'activer/désactiver cet envoi automatique. Le message reste envoyable manuellement depuis la fiche élève.

## Pré-requis côté Zindua

Un modèle WhatsApp approuvé par Meta est nécessaire (nom proposé : `recu-paiement`) avec 4 variables : parent, élève, montant, lien. Tant qu'il n'est pas approuvé, l'app enverra automatiquement le SMS de repli. Le nom du modèle sera saisissable dans Paramètres → Notifications comme les autres.

## Détails techniques

- **Stockage** : nouveau bucket privé `recus` + politiques d'accès réservées au personnel autorisé ; upload du PDF sous `ecole/<ecole_id>/<paiement_id>.pdf`, lien signé 30 jours (même schéma que `bulletins`).
- **Config** : ajout de la colonne `template_recu` à `zindua_config` et d'un indicateur `envoi_auto_recu` (booléen) ; usage `recu` ajouté à `zindua_verifier_envoi` pour le quota et la cadence.
- **Edge function** : `send-whatsapp-zindua` — ajout de l'usage `recu` dans le type `Usage` et la résolution de modèle. Aucune autre logique à modifier (batch, cadence, repli SMS déjà en place).
- **Nouveau module frontend** `src/lib/sendReceiptWhatsApp.ts` : construit le PDF via `buildReceiptPdf` (extraction d'un export réutilisable dans `downloadReceipt.ts`), l'upload, crée le lien signé, puis appelle `envoyerWhatsAppZindua` avec `usage: "recu"`, `fallbackSms: true` et un texte SMS de repli.
- **Points d'appel** (best-effort, sans bloquer l'encaissement, à la place ou en complément du SMS actuel `sendPaymentConfirmationSms`) :
  - `src/pages/finances/components/PaymentDialog.tsx` (scolarité, premier `paiement_id` de la ventilation)
  - `src/pages/finances/components/SettleDialog.tsx`
  - `InvoicePaymentDialog` (cantine/transport)
  - caisse des services ponctuels
- **UI** : dans `NotificationProviders.tsx`, ajout du champ « Modèle — reçu de paiement » et du commutateur d'envoi automatique.
- **Sécurité** : le lien signé expire, le bucket reste privé, aucune donnée sensible dans le corps du message hors nom/montant.
