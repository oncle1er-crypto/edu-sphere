# Paiement en deux moyens (espèces + Wave, etc.)

Permettre à la caisse d'enregistrer un seul encaissement réglé avec **deux moyens de paiement**, partout où l'on encaisse dans l'application, avec **un seul reçu** détaillant les deux parts.

## Ce que verra l'utilisateur

Dans chaque formulaire d'encaissement, sous le montant :

- une case à cocher « Régler en deux moyens de paiement » ;
- quand elle est cochée : deux lignes « Moyen · Montant · Référence », la seconde part se calculant automatiquement (montant total moins la première part) ;
- un contrôle bloquant si la somme des deux parts ne correspond pas au montant encaissé, ou si le même moyen est choisi deux fois ;
- le reçu imprimé/WhatsApp indique le détail : « Espèces 50 000 FCFA + Wave 55 000 FCFA ».

Les points de caisse et récapitulatifs continuent d'attribuer chaque part au bon moyen (le total espèces reste juste pour le comptage de caisse).

## Écrans concernés

- Scolarité : encaissement, solde total, inscription (workflow élève)
- Factures cantine / car (services récurrents)
- Services ponctuels : paiement d'un service, tests d'entrée
- Ventes de tenues
- Cours de vacances : paiements élèves

## Détails techniques

**Composant partagé** `src/components/finances/PaymentModeSplitField.tsx` : rend le sélecteur de moyen simple ou les deux parts, expose `parts: { mode, montant, reference }[]` et un état de validité. Les libellés de moyens restent ceux existants (espèces, Wave, Orange/MTN/Moov Money, virement, chèque).

**Scolarité et factures** (`paiements`, `paiements_services`) : le modèle crée déjà plusieurs lignes par opération. On appelle les RPC existantes (`solder_scolarite`, `enregistrer_paiement`, `enregistrer_paiement_facture`) **une fois par part**, avec la même référence d'opération, puis on fusionne les lignes en un reçu unique.

**Reçus** : `src/lib/receiptOperation.ts` refuse aujourd'hui de fusionner des modes différents (`operation_modes_incoherents`). On l'assouplit : plusieurs modes autorisés le même jour et même référence → `mode: "mixte"` + `repartitionModes: [{ mode, montant }]`. Les dates et références restent contrôlées. Tests unitaires mis à jour (`receiptOperation.test.ts`) et rendu PDF adapté dans `downloadReceipt.ts`, `downloadGlobalReceipt.ts`, `downloadInvoiceReceipt.ts` et le reçu A5 des cours de vacances.

**Tables à une seule ligne par paiement** (`sp_paiements`, `sp_ventes_tenues`, `vacances_paiements`) : migration ajoutant deux colonnes nullables `mode_paiement_2` et `montant_2` (par défaut nulles, aucun impact sur l'existant), avec contrôle : si l'une est renseignée, l'autre l'est aussi, `montant_2 > 0`, et `mode_paiement_2 <> mode_paiement`. Pas de nouvelle ligne créée, donc aucun risque de double décompte de stock pour les tenues.

**Agrégations par moyen** à compléter pour tenir compte de la seconde part : `useRecapCaisse.ts`, `useEntreesRecap.ts`, `useBilanComptable.ts`, `components/reports/ServicePointCaisse.tsx`, `services-ponctuels/sections/SpPointCaisse.tsx`, `lib/reports/exporters.ts` (répartition par mode) et `HomeQuickStats.tsx`.

**Vérifications** : typecheck TypeScript, tests Vitest (`receiptOperation`, `invoiceReceipt`), puis parcours Playwright d'un encaissement scolarité scindé et d'une vente de tenue scindée, avec contrôle du reçu généré et du point de caisse du jour. Aucun déploiement.
