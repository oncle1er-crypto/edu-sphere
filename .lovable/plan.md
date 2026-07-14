## Contexte

Trois problèmes / demandes distincts sur la fiche élève finances :

1. **Bug** : après application d'une grille personnalisée (ex. DIARRA AÏCHATA → « Grande Section — Nouveau » 150 000 FCFA), les tranches restent à 45 000 × 3 = 135 000 FCFA. Vérifié en base : `frais_id_override` est bien mis à jour, mais les 3 tranches conservent leur ancien `frais_id` et leur ancien montant.
2. **Manque** : possibilité d'imprimer un **reçu global** de tous les versements de l'élève, bouton visible **uniquement s'il y a au moins un versement**.
3. **UX** : ajouter des **tooltips explicatifs** sur les 5 cartes de synthèse (Total / Couvert / dont Encaissé / dont Remises / Reste).

## Diagnostic du bug tranche (1)

Deux surcharges de `generer_tranches_eleve` coexistent en base :
- `generer_tranches_eleve(_eleve_id uuid)` — ancienne, préserve les montants des tranches encaissées ;
- `generer_tranches_eleve(_eleve_id uuid, _force_recalc boolean DEFAULT true)` — nouvelle.

PostgREST résout l'appel RPC vers l'ancienne surcharge (résolution ambiguë : arg unique `_eleve_id`), donc `_force_recalc` est ignoré et les montants ne sont jamais recalés. Par ailleurs la division `ROUND(v_total / v_nb)` peut créer un écart d'arrondi (ex. 100 000/3 → 33 333×3 = 99 999) ⇒ la somme des tranches ne colle pas au total de la grille.

## Changements

### A. Migration SQL — corriger le bug d'ambiguïté et l'arrondi
- `DROP FUNCTION public.generer_tranches_eleve(uuid);` (l'ancienne surcharge 1-arg).
- Réécrire la version 2-arg pour absorber le résidu d'arrondi sur la **dernière tranche** : `montant_derniere = v_total - v_montant_unit * (v_nb - 1)`. Appliqué au `UPDATE` final (numero < 0) et à l'`INSERT` de la boucle de complétion.

### B. UI — `CustomFeeOverride.tsx`
Aucun changement de logique nécessaire côté client (la RPC deviendra correcte après A). On garde l'appel `rpc("generer_tranches_eleve", { _eleve_id, _force_recalc })`.

### C. Reçu global des versements — `StudentDetailDrawer.tsx`
- Nouveau bouton « Reçu global » (icône `Printer`) dans l'en-tête du bloc *Paiements & remises*.
- Condition d'affichage : `eleve.paiements && eleve.paiements.length > 0`.
- Génère un PDF récapitulant : entête école (logo, adresse), bloc élève, tableau `Date · Réf. · Mode · Type · Montant`, sous-totaux **Encaissements** / **Remises & bourses**, **Total couvert**, **Reste à payer**.

### D. Nouveau helper `src/lib/downloadGlobalReceipt.ts`
- Signature : `downloadGlobalReceipt({ ecoleId, eleveId })`.
- Récupère `ecoles`, `eleves` (+ classe), tous les `paiements` (avec `mode`, `type`, `reference`, `motif`, `date_paiement`, `montant`), toutes les `tranches` (pour totaux) via Supabase.
- Utilise **jsPDF + autoTable** (déjà utilisé dans `generateDocumentsPDF.ts`) et reproduit l'entête existante pour cohérence graphique.
- Nom du fichier : `recu-global-{matricule}.pdf`.

### E. Tooltips sur les 5 cartes de synthèse (`StudentDetailDrawer.tsx`)
Utiliser `HelpTooltip` (déjà présent — `@/components/help`) posé à côté du libellé de chaque carte :

- **Total** : « Frais annuels dus selon la grille tarifaire appliquée à cet élève. »
- **Couvert** : « Part du total prise en charge : versements + remises / bourses. »
- **dont Encaissé** : « Sommes réellement reçues en caisse (hors remises et bourses). »
- **dont Remises** : « Réductions accordées : remises, bourses ou prise en charge externe. »
- **Reste** : « Montant qu'il reste à payer par la famille (Total − Couvert). »

## Fichiers touchés

- `supabase/migrations/<new>.sql` — DROP + réécriture RPC.
- `src/pages/finances/components/CustomFeeOverride.tsx` — inchangé (bénéficie du fix RPC).
- `src/lib/downloadGlobalReceipt.ts` — **nouveau**.
- `src/pages/finances/components/StudentDetailDrawer.tsx` — bouton reçu global + tooltips sur les 5 cartes.

## Hors périmètre
- Aucun changement de logique métier hors bug d'ambiguïté et arrondi.
- Pas d'envoi WhatsApp du reçu global à cette itération (seulement téléchargement PDF) ; à ajouter facilement plus tard si demandé.
- Pas de recalcul manuel pour DIARRA : après le déploiement du fix, il suffira de rouvrir sa fiche, désélectionner puis re-sélectionner « Grande Section — Nouveau » (avec case cochée) et cliquer *Appliquer*, ou d'exécuter `SELECT public.generer_tranches_eleve('52b76af2…', true);` une fois.
