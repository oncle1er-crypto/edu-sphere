-- =====================================================================
-- Piste d'audit du workflow de validation des dépenses
-- =====================================================================
-- Contexte : audit du module Paiements > Dépenses (10/08/2026). La colonne
-- `enregistre_par` existait déjà dans le schéma mais n'était jamais
-- renseignée par le code applicatif (aucun trigger, aucune valeur passée à
-- l'insertion) : aucune traçabilité de qui saisit une dépense. De même,
-- aucune colonne ne permettait de savoir qui a validé ou rejeté une dépense,
-- ni quand, ni pourquoi en cas de rejet.
--
-- Cette migration :
--   1. Ajoute une contrainte FK sur enregistre_par -> auth.users (déjà
--      nullable, aucune ligne existante affectée par l'ajout de la
--      contrainte puisqu'elle autorise NULL).
--   2. Ajoute valide_par / valide_le (renseignés au moment du passage au
--      statut 'validee').
--   3. Ajoute rejete_par / rejete_le / motif_rejet (renseignés au moment du
--      passage au statut 'rejetee' — ce statut existait déjà côté
--      affichage frontend mais n'était déclenché par aucune action).
--
-- Limite connue (documentée, pas contournée) : l'affichage du NOM de la
-- personne ayant validé/rejeté n'est PAS implémenté dans cette migration.
-- La table `profiles` a une politique RLS "Users see own profile" qui
-- limite la lecture d'un profil au seul utilisateur concerné : un
-- utilisateur ne peut pas lire le profil d'un collègue. Élargir cette
-- politique RLS est un changement de sécurité distinct qui nécessite une
-- autorisation explicite séparée — non fait ici. Les UUID sont stockés
-- (traçabilité en base, exploitable via un accès admin/service_role ou une
-- future évolution de la politique RLS), mais l'interface actuelle
-- n'affiche que la date de validation/rejet, pas le nom.
--
-- Idempotente (rejouable depuis une base vierge via `supabase db reset`).
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'depenses_enregistre_par_fkey'
  ) THEN
    ALTER TABLE public.depenses
      ADD CONSTRAINT depenses_enregistre_par_fkey
      FOREIGN KEY (enregistre_par) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS valide_par UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valide_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejete_par UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejete_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motif_rejet TEXT;
