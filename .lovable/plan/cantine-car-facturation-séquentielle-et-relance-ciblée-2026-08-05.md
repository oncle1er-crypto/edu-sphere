# Cantine & Car : facturation séquentielle et relance ciblée

Objectif : une seule facture ouverte à la fois par abonné, générée automatiquement après l'échéance de la précédente (ou manuellement au moment d'un encaissement), jamais avant que la précédente soit soldée. Et un bouton de relance SMS qui n'apparaît que là où il y a réellement des impayés. Identique pour la cantine et le car.

## 1. Remise à zéro des factures en attente

Aujourd'hui la base contient **15 factures cantine (341 000 F)** et **2 factures car (50 000 F)** au statut « Émise », toutes sans aucun versement. Elles ont été générées en bloc pour toute l'année, ce qui gonfle artificiellement le « facturé » et brouille la lecture.

Toutes ces factures sans versement passent en **Annulée**, avec la note « Annulée — passage à la facturation séquentielle ». Les factures déjà payées (18 cantine, 10 car) ne sont pas touchées, les reçus déjà imprimés restent valables.

## 2. Nouveau workflow de facturation

Règle unique : **une seule échéance ouverte par abonné et par service.**

- **Génération manuelle** — le bouton « Générer » crée uniquement la **prochaine échéance non encore facturée** (la plus ancienne de la grille tarifaire restante), pas toute l'année.
- **Blocage si dette** — s'il existe déjà une facture non soldée pour cet abonné, aucune nouvelle n'est créée : message clair « La facture CTN-… (échéance du 05/11/2026) n'est pas soldée. Encaissez-la avant d'ouvrir la période suivante. »
- **Génération automatique** — dès que la facture en cours est soldée **et** que sa date d'échéance est atteinte, la suivante est créée à la demande (ouverture de l'écran Abonnés / Facturation, ou clic sur « Encaisser »), sans action manuelle. Avant l'échéance, rien n'est créé : le parent peut cependant payer d'avance via « Encaisser par anticipation », qui ouvre immédiatement la période suivante.
- **Génération en masse** — le bouton reste, mais avance chaque abonné d'une seule période et rapporte le résultat : « 12 factures ouvertes · 4 abonnés bloqués (facture précédente non soldée) ».
- **Abonnements résiliés/suspendus** — aucune génération, comportement déjà en place.

Une ligne d'information sur chaque abonné indique la période en cours et la prochaine à ouvrir.

## 3. Relance SMS uniquement sur les impayés

- Le bouton « Relancer les impayés (n) » est **retiré de la barre d'outils générale** des Abonnés.
- Il apparaît dans **Facturation cantine / Facturation car**, au-dessus de la liste, et **seulement** quand le filtre statut porte sur des factures en retard — c'est-à-dire échéance dépassée et reste dû > 0. Le compteur reflète exactement les lignes affichées.
- Chaque ligne de facture en retard reçoit une **icône SMS** pour une relance individuelle.
- Le bandeau d'alerte des échéances dépassées continue de renvoyer vers cette liste filtrée.
- Le contenu du message, les destinataires (contact principal du parent) et l'horodatage de la dernière relance restent inchangés.

## Détails techniques

- **Migration SQL** :
  - `UPDATE factures SET statut='annulee'` pour `categorie IN ('cantine','transport') AND statut='emise' AND COALESCE(montant_paye,0)=0`.
  - Réécriture de `generer_factures_service(_ecole_id, _abonnement_id, _service_type)` (signature inchangée, retour `int`) : refuse si une facture de la catégorie est non soldée (`montant_paye < montant`, statut ≠ `annulee`) → `RAISE EXCEPTION 'facture_precedente_non_soldee:<numero>:<echeance>'` ; sinon crée **une seule** facture — la tranche de rang le plus faible non encore facturée — et uniquement si sa date d'échéance ≤ `CURRENT_DATE` ou si le paramètre d'anticipation est passé. Ajout d'un paramètre optionnel `_forcer boolean DEFAULT false` pour l'encaissement par anticipation.
  - Mise à jour de `echeances_services` en cohérence (statut `due`/`retard` de la période ouverte).
- **Front** :
  - `src/lib/dbErrorMessages.ts` : nouvelle règle `facture_precedente_non_soldee` → message français avec numéro et date.
  - `src/hooks/useServiceInvoicing.ts` : `generateFor(abonnementId, { forcer })`, retour enrichi (créées / bloquées) pour le mode masse, appel automatique d'avance de période au chargement.
  - `CanteenSubscribers.tsx` / `TransportSubscribers.tsx` : retrait du bouton de relance de la barre d'outils, libellé « Générer la prochaine période », affichage période en cours / prochaine.
  - `CanteenBilling.tsx` / `TransportBilling.tsx` : filtre statut enrichi d'un choix **« En retard »**, bouton « Relancer les impayés (n) » conditionné à ce filtre, icône SMS par ligne en retard, réemploi de `RelanceImpayesDialog`.
- Aucune suppression de colonne, de RPC ou de statut existant ; filtrage `ecole_id` + cycle conservé.
