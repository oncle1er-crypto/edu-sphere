-- Resynchronisation (pas une correction fonctionnelle) : lors de
-- l'application en production (éditeur SQL Lovable Cloud) de la migration
-- 20260817083000_depenses_secretaire_brouillons.sql, le même bug de
-- l'éditeur qui empêchait la saisie fiable de texte long accentué (cf.
-- 20260818110000 et 20260818130000 pour le même défaut sur les RPC
-- annuler_paiement_facture / modifier_montant_paiement_facture) a nécessité
-- de saisir les libellés app_modules sans accents ni tiret cadratin :
--
--   finances.depenses      : « Finances — Dépenses (accès restreint) »
--                             devenu « Finances - Depenses (acces restreint) »
--   finances.bilan_rapports: « Finances — Bilan & Rapports (lecture) »
--                             devenu « Finances - Bilan and Rapports (lecture) »
--
-- Aucun impact fonctionnel (texte affiché dans le menu/UI uniquement), mais
-- le fichier git ne reflétait plus fidèlement l'état réel de production.
-- Ces valeurs ont été vérifiées par lecture directe de production
-- (SELECT key, label FROM public.app_modules WHERE key IN (...)) avant
-- d'écrire cette migration.
--
-- Cette migration met à jour les libellés pour qu'ils correspondent
-- exactement au texte déployé en production. Son application en production
-- est donc un no-op strict (UPDATE ... SET label = valeur déjà présente).

UPDATE public.app_modules
   SET label = 'Finances - Depenses (acces restreint)'
 WHERE key = 'finances.depenses';

UPDATE public.app_modules
   SET label = 'Finances - Bilan and Rapports (lecture)'
 WHERE key = 'finances.bilan_rapports';
