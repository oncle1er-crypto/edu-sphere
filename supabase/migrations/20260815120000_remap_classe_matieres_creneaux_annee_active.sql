-- Correction de données — classe_id incohérent avec l'année scolaire active
-- (Emploi du temps / Matières & volumes).
--
-- Contexte (cf. commits 07d4309 et 313b6ad du 2026-08-15) :
-- WeeklyView.tsx, SubjectsClassesAssignment.tsx et SubjectsVolumes.tsx
-- appelaient useClasses() sans filtrer par année scolaire, affichant deux
-- fois chaque classe (une par année) sous le même nom. Des affectations
-- classe_matieres et des créneaux ont ainsi été rattachés par erreur aux
-- classes de l'année ARCHIVÉE (2025-2026) au lieu des classes de l'année
-- ACTIVE (2026-2027), alors même que les créneaux portaient déjà le bon
-- annee_id (celui de l'année active).
--
-- État constaté en production avant ce script (vérifié via requêtes
-- read-only, aucune écriture) :
--   - classe_matieres : 135/135 lignes -> classe_id de l'année archivée.
--   - creneaux_emploi_temps : 804 lignes au total =
--       402 lignes annee_id = année archivée, classe_id cohérent (le vrai
--         historique 2025-2026, à NE PAS toucher) ;
--       402 lignes annee_id = année active, classe_id incohérent (pointant
--         vers l'année archivée) -> ce sont les seules concernées ici.
--
-- Ce script :
--   1. Ne touche AUCUNE ligne dont annee_id = année archivée.
--   2. Remappe les 402 creneaux_emploi_temps incohérents (annee_id =
--      année active) vers le classe_id de la classe homonyme de l'année
--      active — mapping 1:1 vérifié par nom sur les 17 classes de l'école
--      (aucun nom orphelin des deux côtés).
--   3. Remappe classe_matieres (135 lignes) vers les classes de l'année
--      active. classe_matieres n'a pas de colonne annee_id propre (son
--      "année" est implicite via classe_id -> classes.annee_id) : ces
--      lignes représentent la configuration matières/volumes courante de
--      l'école et sont donc déplacées (et non dupliquées) vers l'année
--      active. Aucune ligne classe_matieres n'existe aujourd'hui pour les
--      classes 2026-2027 (vérifié), donc ce remappage ne peut pas violer
--      la contrainte UNIQUE(classe_id, matiere_id).
--
-- Idempotent : si rejoué, les WHERE ne matcheront plus rien (classe_id
-- déjà remappé côté classes actives), donc 0 ligne affectée la deuxième
-- fois. Portée limitée à l'école a0000000-0000-0000-0000-000000000001
-- (école unique de ce déploiement) par sécurité supplémentaire.

DO $$
DECLARE
  v_ecole_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_annee_active uuid := 'd0aa1e69-580d-4ff8-b0fd-86440cb63a67';
  v_cr_count int;
  v_cm_count int;
BEGIN
  CREATE TEMP TABLE _classe_mapping_20260815 (old_id uuid, new_id uuid, nom text) ON COMMIT DROP;
  INSERT INTO _classe_mapping_20260815 (old_id, new_id, nom) VALUES
    ('bbbcf87b-db03-496e-b8a0-4f9a0dfeec01', '4c5232c2-6741-42ab-9518-fb521d853fd5', '3ème A'),
    ('de9e139f-2f77-4def-9219-1f8f8bf54f0d', 'f6c70e57-a7fc-408b-ad71-6e9fdcb7ddf0', '3ème B'),
    ('3377ea56-f9b2-4eea-8659-8ac0f0e48c52', '388a5cbc-5b78-434f-8a91-fbb875d7576a', '4ème A'),
    ('850fcc9c-0389-4bd5-a804-0a581108f35e', '81d80124-b618-4413-9ffb-67e62869abb6', '4ème B'),
    ('6767f599-2630-43d1-8592-dbd93291c997', 'c749939b-2ce7-498f-bdab-e79c78fc6e44', '5ème A'),
    ('0495bcfe-c869-4726-86a2-fa37e8b607c1', '84f668f2-cabc-4eeb-a3a3-12d6de1e9a23', '5ème B'),
    ('2076951e-084e-4317-a6eb-f3f0d533c9d0', 'cfaeba4b-4313-4d42-9823-e7dac23cbcd9', '6ème A'),
    ('28b58e48-5e5b-4f0f-b36e-5f8fbccba801', '49b695c3-b0d0-4a58-bd1c-2e95337028a9', '6ème B'),
    ('19b9d647-d210-4bd2-b947-3a0a12f81c30', '1807d8d1-67bb-4349-a861-5db4a8c784c1', 'CE1'),
    ('eff3f563-0239-4d16-aa14-2b5a1ffb355a', 'ea134134-987e-4464-b91d-8d4066ed75e9', 'CE2'),
    ('a0f70177-d302-42b8-aaf8-6c7b0e348586', 'ce6729d4-c2d9-4f33-9d05-2fb6ddd024d2', 'CM1'),
    ('21e95953-26da-45c8-b6f7-d4d1d327d6a8', '0f99b725-8f70-4ece-b86a-b52f7dfd68b7', 'CM2'),
    ('173fba31-c2b5-4039-a99b-801e8324e25b', '2c9a3c6c-52ae-4159-a03b-1779e1673bd9', 'CP1'),
    ('425f06be-9918-4845-ac2f-15c1f40270b0', '78ebb405-9caf-4949-b19b-73cce86ece13', 'CP2'),
    ('a91df190-c6c9-428a-a976-5ccca1cf5d03', 'df4f8713-272d-448b-85d1-c32b79c7b79e', 'Grande Section'),
    ('907f33ed-3c93-46d5-ac98-98ace8bf1d47', '50a29739-2bfe-4ccf-ad11-74fd81e08c7b', 'Moyenne Section'),
    ('14beb846-14e1-4024-8d5d-94720549f855', '9097b143-9d6f-4434-ac38-9b2d520a83ad', 'Petite Section');

  -- Garde-fou : ce script cible un incident précis d'UNE base de données
  -- (celle de cette école). Sur toute autre base — un environnement CI ou
  -- un `supabase db reset` sur une base vierge sans données de seed — les
  -- UUID ci-dessus n'existeront simplement pas. Dans ce cas on NE DOIT PAS
  -- faire échouer le reset : on émet un NOTICE et on sort sans écrire.
  IF NOT EXISTS (SELECT 1 FROM public.annees_scolaires WHERE id = v_annee_active) THEN
    RAISE NOTICE 'Remappage 20260815 ignoré : année scolaire % absente de cette base (base vierge ou autre environnement).', v_annee_active;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM _classe_mapping_20260815 m
    WHERE NOT EXISTS (
      SELECT 1 FROM public.classes co
      WHERE co.id = m.old_id AND co.ecole_id = v_ecole_id AND co.nom = m.nom AND co.annee_id <> v_annee_active
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.classes cn
      WHERE cn.id = m.new_id AND cn.ecole_id = v_ecole_id AND cn.nom = m.nom AND cn.annee_id = v_annee_active
    )
  ) THEN
    RAISE NOTICE 'Remappage 20260815 ignoré : le mapping classe_id attendu ne correspond pas à l''état de cette base (aucune écriture).';
    RETURN;
  END IF;

  UPDATE public.creneaux_emploi_temps c
     SET classe_id = m.new_id
    FROM _classe_mapping_20260815 m
   WHERE c.ecole_id = v_ecole_id
     AND c.annee_id = v_annee_active
     AND c.classe_id = m.old_id;
  GET DIAGNOSTICS v_cr_count = ROW_COUNT;

  UPDATE public.classe_matieres cm
     SET classe_id = m.new_id
    FROM _classe_mapping_20260815 m
   WHERE cm.ecole_id = v_ecole_id
     AND cm.classe_id = m.old_id;
  GET DIAGNOSTICS v_cm_count = ROW_COUNT;

  RAISE NOTICE 'Remappage terminé : % creneaux_emploi_temps et % classe_matieres remappés vers l''année active.', v_cr_count, v_cm_count;
END $$;
