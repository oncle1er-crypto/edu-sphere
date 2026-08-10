-- =====================================================================
-- Relation FK manquante : sp_paiements.candidat_id -> sp_candidats.id
-- =====================================================================
-- Contexte
-- --------
-- sp_paiements.candidat_id existe (colonne uuid nullable) mais n'a jamais eu
-- de contrainte FK déclarée vers sp_candidats. Conséquence constatée le
-- 10/08/2026 : useBilanComptable.ts effectue une jointure imbriquée
-- PostgREST `sp_candidats(classe_demandee_id)` sur sp_paiements pour
-- rattacher au bon niveau les paiements de services ponctuels sans élève
-- inscrit (candidats externes : tests d'entrée, ventes diverses...).
-- Sans contrainte FK, PostgREST ne peut pas résoudre cette relation et
-- renvoie une erreur PGRST200 ("Could not find a relationship...").
--
-- Le code appelant ne vérifiait pas `error` sur cette requête : la variable
-- spPaiements valait donc `null` en permanence, et la boucle
-- `for (const p of (spPaiements ?? []) as any[])` s'exécutait sur un
-- tableau vide. Résultat : AUCUNE recette de service ponctuel (tenues,
-- tests d'entrée, et tout futur service du "Catalogue des services")
-- n'apparaissait jamais dans le Bilan Comptable, dans aucune vue (Global,
-- Primaire, Secondaire) — pas seulement lors d'un filtrage par niveau.
--
-- Diagnostic préalable (lecture seule, vérifié sur production
-- yvsnokvgxqtpqkuizsfo / projet gs-laprovidence, le 2026-08-10) :
--   sp_paiements.candidat_id (12 lignes renseignées) : 0 orphelin.
--
-- Effet sur la production : ajout d'une contrainte FK, idempotente,
-- aucune donnée modifiée. Ne doit pas échouer compte tenu du diagnostic
-- ci-dessus.
-- =====================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_paiements_candidat_id_fkey') THEN
    ALTER TABLE public.sp_paiements
      ADD CONSTRAINT sp_paiements_candidat_id_fkey
      FOREIGN KEY (candidat_id) REFERENCES public.sp_candidats(id) ON DELETE SET NULL;
  END IF;
END $$;
