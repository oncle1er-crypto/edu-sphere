-- =====================================================================
-- Rattachement des classes de cours de vacances à un cycle (niveau)
-- =====================================================================
-- Contexte : le Bilan comptable (Fiche de suivi de trésorerie) traitait la
-- ligne "Cours de vacances" comme "Commune" (toujours visible, quel que
-- soit le niveau Primaire/Secondaire sélectionné), car aucune des tables
-- vacances_classes / vacances_eleves / vacances_paiements ne possédait de
-- colonne cycle_id ou niveau — vérifié sur les 3 migrations d'origine
-- (20260707160924, 20260708075718, 20260721013413) : aucune ne l'ajoute.
-- Constaté le 10/08/2026 : le filtre de niveau n'avait donc aucun effet
-- sur cette ligne, qui affichait toujours le total de toute l'école.
--
-- Cette migration ajoute une colonne cycle_id NULLABLE sur vacances_classes
-- (FK vers cycles, ON DELETE SET NULL) :
--   - NULL = "Commune" (comportement actuel préservé pour les classes déjà
--     créées : rien ne change tant que personne n'assigne un cycle) ;
--   - renseigné = la classe de vacances est rattachée à un niveau précis et
--     devient filtrable, exactement comme classes.cycle_id.
--
-- Idempotente (rejouable depuis une base vierge via `supabase db reset`).
-- =====================================================================

ALTER TABLE public.vacances_classes
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_vac_classes_cycle ON public.vacances_classes(cycle_id);

-- ── Rattrapage des classes créées avant cette migration ──
-- Au moment d'écrire cette migration, les seules classes de vacances
-- existantes sont CP1, CP2, CE1, CE2, CM1, CM2 (vérifié en base le
-- 10/08/2026) : toutes des classes de niveau Primaire au sens strict,
-- aucune Secondaire. On les rattache donc automatiquement au cycle
-- "Primaire" de leur école, plutôt que de les laisser indéfiniment
-- "Commune" alors qu'on connaît déjà leur vrai niveau.
-- Ne touche que les lignes encore NULL (idempotent, ne modifie jamais un
-- choix explicite fait depuis l'interface) et ne suppose l'existence
-- d'aucun UUID de cycle : résout le cycle "Primaire" par école via une
-- jointure sur son nom.
UPDATE public.vacances_classes vc
SET cycle_id = c.id
FROM public.cycles c
WHERE vc.cycle_id IS NULL
  AND c.ecole_id = vc.ecole_id
  AND c.nom ILIKE 'primaire';
