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

## Bouton de test par modèle

Chaque modèle listé dans Paramètres → Notifications (OTP, test, relance, échéance, bulletin, reçu) reçoit son propre bouton « Tester » à côté du champ :

- On saisit une fois un numéro de test (mémorisé pour la session), puis un clic envoie un vrai message WhatsApp avec ce modèle et des variables d'exemple.
- Le résultat s'affiche en clair : « Envoyé », ou le motif exact du refus (modèle introuvable, WhatsApp non connecté, quota, cadence, numéro hors liste de test).
- Un état visuel par ligne (vert « OK », rouge « échec ») reste affiché après le test pour repérer d'un coup d'œil les modèles à corriger.
- Aucun repli SMS pendant un test : on veut savoir si WhatsApp fonctionne réellement.

## Coordonnées du parent obligatoires à l'encaissement

Avant toute validation d'encaissement (scolarité, cantine, transport, services ponctuels) :

- Si le nom du parent ou son numéro de téléphone est absent ou invalide (format ivoirien : +225 puis 10 chiffres commençant par 01/05/07/27), une fenêtre modale bloquante s'ouvre : « Coordonnées du parent incomplètes ».
- L'utilisateur y saisit nom, prénom, téléphone (et éventuellement un second numéro et le lien de parenté). L'enregistrement met à jour la fiche parent liée à l'élève et l'encaissement reprend automatiquement là où il s'était arrêté.
- Impossible de fermer la modale sans compléter, hormis un bouton « Annuler l'encaissement ».
- Les mêmes informations restent modifiables à tout moment depuis la fiche élève.

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
- **UI** : dans `NotificationProviders.tsx`, ajout du champ « Modèle — reçu de paiement », du commutateur d'envoi automatique et d'un bouton « Tester » par ligne de modèle (appel `envoyerWhatsAppZindua` avec `template` forcé, `fallbackSms: false`, variables d'exemple ; état `Record<clé, "ok" | "echec">` pour l'affichage).
- **Coordonnées parent** : nouveau composant `src/components/finances/ParentInfoRequiredDialog.tsx` (validation zod, normalisation du numéro via l'équivalent client de `normalizePhoneCI`, écriture sur `parents` + liaison `eleve_parents` si absente). Un petit hook `useParentContactGuard` expose `verifierAvant(eleve, continuer)` et est branché dans `PaymentDialog.tsx`, `SettleDialog.tsx`, `InvoicePaymentDialog.tsx` et `ServicePaymentDialog.tsx`.
- **Sécurité** : le lien signé expire, le bucket reste privé, aucune donnée sensible dans le corps du message hors nom/montant. Les saisies de la modale parent sont validées et bornées côté client et protégées par les politiques RLS existantes de `parents`.
