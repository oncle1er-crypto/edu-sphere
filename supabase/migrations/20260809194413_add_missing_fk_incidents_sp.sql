-- =====================================================================
-- Relations FK manquantes : incidents_discipline, sp_paiements, sp_ventes_tenues
-- =====================================================================
-- Contexte
-- --------
-- Ces 3 tables ont des colonnes eleve_id / classe_id / ecole_id / annee_id /
-- caissier_id / enregistre_par sans contrainte FK déclarée, ce qui empêche
-- PostgREST de résoudre les jointures imbriquées (erreur PGRST200 :
-- "Could not find a relationship... in the schema cache") utilisées par le
-- frontend pour afficher élève/classe sur ces enregistrements.
--
-- Diagnostic préalable (lecture seule, vérifié sur production
-- yvsnokvgxqtpqkuizsfo / projet gs-laprovidence, le 2026-08-09) :
--   - sp_paiements.eleve_id / ecole_id / caissier_id      : 0 orphelin
--   - sp_ventes_tenues.eleve_id / ecole_id / caissier_id  : 0 orphelin
--   - incidents_discipline.ecole_id / classe_id / annee_id / enregistre_par : 0 orphelin
--   - incidents_discipline.eleve_id : 20/20 lignes orphelines
--
-- Cause racine (incidents_discipline.eleve_id) : ces 20 lignes ont été
-- créées le 2026-05-04 (un seul lot), soit avant la création de la moindre
-- ligne dans la table eleves actuelle (à partir du 2026-07-07). Elles
-- référencent un ancien jeu d'élèves remplacé depuis par les données
-- réelles de l'école. audit_logs ne remonte que jusqu'au 2026-05-26 :
-- aucune trace ne permet de retrouver le bon élève actuel pour ces lignes.
-- Décision validée par l'utilisateur (Frederic, 2026-08-09) : détacher ces
-- 20 lignes (eleve_id -> NULL) plutôt que les supprimer, afin de conserver
-- l'historique disciplinaire (type, date, classe, gravité).
--
-- Effet sur la production
-- ------------------------
-- - 1 UPDATE ciblé : au plus 20 lignes de incidents_discipline (celles
--   dont l'eleve_id ne correspond à aucun eleve existant). No-op si déjà
--   nettoyé.
-- - incidents_discipline.eleve_id passe de NOT NULL à NULLABLE (nécessaire
--   pour permettre le détachement ci-dessus ; ne change aucun autre
--   comportement pour les lignes valides).
-- - Ajout de 10 contraintes FK, toutes idempotentes (DO $$ ... IF NOT
--   EXISTS $$), aucune ne doit échouer compte tenu du diagnostic ci-dessus.
-- =====================================================================

-- A) Rendre eleve_id nullable sur incidents_discipline (requis pour B)
ALTER TABLE public.incidents_discipline
  ALTER COLUMN eleve_id DROP NOT NULL;

-- B) Détacher les lignes dont l'eleve_id ne correspond à aucun élève réel
UPDATE public.incidents_discipline i
   SET eleve_id = NULL
 WHERE i.eleve_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.eleves e WHERE e.id = i.eleve_id);

-- C) Ajout des contraintes FK manquantes (idempotent)
-- Chaque contrainte est ajoutée dans son propre bloc DO, pour qu'un éventuel
-- échec isolé (ex. environnement de test avec un auth.users partiel) ne
-- fasse pas échouer/annuler les contraintes déjà validées comme saines.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incidents_discipline_ecole_id_fkey') THEN
    ALTER TABLE public.incidents_discipline
      ADD CONSTRAINT incidents_discipline_ecole_id_fkey
      FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incidents_discipline_classe_id_fkey') THEN
    ALTER TABLE public.incidents_discipline
      ADD CONSTRAINT incidents_discipline_classe_id_fkey
      FOREIGN KEY (classe_id) REFERENCES public.classes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incidents_discipline_annee_id_fkey') THEN
    ALTER TABLE public.incidents_discipline
      ADD CONSTRAINT incidents_discipline_annee_id_fkey
      FOREIGN KEY (annee_id) REFERENCES public.annees_scolaires(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incidents_discipline_eleve_id_fkey') THEN
    ALTER TABLE public.incidents_discipline
      ADD CONSTRAINT incidents_discipline_eleve_id_fkey
      FOREIGN KEY (eleve_id) REFERENCES public.eleves(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incidents_discipline_enregistre_par_fkey') THEN
    ALTER TABLE public.incidents_discipline
      ADD CONSTRAINT incidents_discipline_enregistre_par_fkey
      FOREIGN KEY (enregistre_par) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_paiements_eleve_id_fkey') THEN
    ALTER TABLE public.sp_paiements
      ADD CONSTRAINT sp_paiements_eleve_id_fkey
      FOREIGN KEY (eleve_id) REFERENCES public.eleves(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_paiements_ecole_id_fkey') THEN
    ALTER TABLE public.sp_paiements
      ADD CONSTRAINT sp_paiements_ecole_id_fkey
      FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_paiements_caissier_id_fkey') THEN
    ALTER TABLE public.sp_paiements
      ADD CONSTRAINT sp_paiements_caissier_id_fkey
      FOREIGN KEY (caissier_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_ventes_tenues_eleve_id_fkey') THEN
    ALTER TABLE public.sp_ventes_tenues
      ADD CONSTRAINT sp_ventes_tenues_eleve_id_fkey
      FOREIGN KEY (eleve_id) REFERENCES public.eleves(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_ventes_tenues_ecole_id_fkey') THEN
    ALTER TABLE public.sp_ventes_tenues
      ADD CONSTRAINT sp_ventes_tenues_ecole_id_fkey
      FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_ventes_tenues_caissier_id_fkey') THEN
    ALTER TABLE public.sp_ventes_tenues
      ADD CONSTRAINT sp_ventes_tenues_caissier_id_fkey
      FOREIGN KEY (caissier_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
