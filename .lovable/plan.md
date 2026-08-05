# Cantine & Car : clarifier, relancer, résilier

Objectif : rendre les écrans Cantine et Car compréhensibles au premier regard, permettre de relancer par SMS les familles en retard, signaler dans l'application les échéances arrivées à terme, et gérer proprement un élève qui arrête le service en cours d'année. Sans casser l'existant : aucune colonne, RPC ou statut actuel n'est renommé ni supprimé.

## 1. Clarifier le vocabulaire (écrans uniquement)

Aujourd'hui les 4 cartes du haut affichent « Abonnés actifs / Facturé / Encaissé / Impayé » sans définition, et « Impayé » mélange ce qui est en retard et ce qui n'est pas encore dû.

Nouvelle lecture, identique pour la cantine et le car :

- **Abonnés actifs** — abonnements en cours sur l'année sélectionnée (hors suspendus et résiliés).
- **Facturé à ce jour** — total des factures émises, échues ou en cours.
- **Encaissé** — total réellement reçu en caisse.
- **En retard** (remplace « Impayé ») — uniquement les échéances dépassées et non soldées : c'est ce chiffre qui déclenche les relances.
- **À venir** (nouvelle carte) — périodes déjà facturées dont la date d'échéance n'est pas atteinte.

Chaque carte reçoit une infobulle avec sa définition. Les statuts de ligne deviennent explicites : `Actif`, `Suspendu`, `Résilié`, et pour les factures `À jour`, `Partiel`, `En retard`, `À venir`, `Annulée`.

## 2. Arrêt d'abonnement en cours d'année

Le bouton actuel « Désactiver » passe simplement le statut à `resilie` et laisse les factures futures en dette. Il est remplacé par une **résiliation** en 3 champs : date d'effet, motif, confirmation.

À la validation :

- l'abonnement passe en `resilie` avec sa date d'effet et son motif conservés ;
- les factures **impayées dont l'échéance est postérieure à la date d'effet** sont annulées (le montant déjà payé reste tracé, rien n'est supprimé) ;
- les échéances déjà dépassées et non payées **restent dues** et continuent d'apparaître dans « En retard » ;
- la facturation automatique ne génère plus rien pour cet abonnement.

Un état intermédiaire **Suspendu** est ajouté (pause temporaire : plus de nouvelles factures, aucune annulation), utile pour une absence longue avant un éventuel retour.

## 3. Relances SMS des familles non à jour

- Bouton **« Relancer les impayés »** au-dessus de la liste : ouvre un aperçu des destinataires (élève, classe, parent, numéro, montant en retard), signale les élèves sans numéro de parent, puis envoie en une fois.
- **Icône SMS sur chaque ligne** en retard pour une relance individuelle.
- Message type, modifiable avant envoi, dans le canal SMS existant du projet, avec les montants en FCFA et le nom du service.
- Chaque envoi est journalisé (historique des relances de l'élève), et la date de dernière relance s'affiche dans la liste pour éviter les doublons.

## 4. Notification en application des échéances arrivées à terme

- Bandeau d'alerte sur les tableaux de bord Cantine et Car : « X échéances arrivées à terme, Y en retard », cliquable vers la liste filtrée.
- Même alerte remontée dans le panneau d'alertes de l'accueil, à côté des alertes existantes.
- Aucun SMS automatique : la notification reste interne, l'envoi vers les parents reste déclenché manuellement (point 3).

## Détails techniques

- **Migration** (additive uniquement) : colonnes `date_debut`, `date_fin_effet`, `motif_resiliation`, `derniere_relance_at` sur `abonnements_cantine` et `abonnements_transport`, toutes nullables ; le statut `suspendu` est autorisé en plus de `actif` / `resilie`.
- **Nouvelle RPC** `resilier_abonnement_service(_abonnement_id, _service_type, _date_effet, _motif)` : transaction unique qui met à jour l'abonnement, annule les factures impayées à échéance postérieure et les lignes `echeances_services` correspondantes. `generer_factures_service` est ajustée pour ignorer les abonnements `resilie`/`suspendu` — sa signature ne change pas.
- **Front** : nouveau hook `src/hooks/useServiceEcheances.ts` (agrégats retard / à venir / à terme, partagé cantine + car), nouveaux composants `ResilierAbonnementDialog.tsx` et `RelanceImpayesDialog.tsx` dans `src/components/services/`, réutilisés par `CanteenSubscribers.tsx` et `TransportSubscribers.tsx`.
- **Réemploi** : `useRelances`, `normalizeSmsText`, la fonction d'envoi SMS et `messageErreurBase` déjà en place ; les cartes KPI et alertes suivent le style bordeaux/jaune existant.
- Types Supabase régénérés après migration. Filtrage `ecole_id` + cycle (Primaire/Secondaire/Global) conservé partout.
