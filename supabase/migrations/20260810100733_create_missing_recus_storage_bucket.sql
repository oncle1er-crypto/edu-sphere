-- Correction bug moyen (audit module Paiements, 10/08/2026) :
--
-- Le bucket de stockage "recus" (reçus PDF d'encaissement/remise, cf.
-- src/lib/sendReceiptWhatsApp.ts) existe en production mais n'a jamais été
-- capturé dans les migrations — il a été cree hors-bande (dashboard Supabase),
-- probablement avant la mise en place du suivi des migrations pour le Storage.
-- Consequence : `supabase db reset` ne peut jamais le recreer localement, d'ou
-- l'echec systematique "Bucket not found" lors de la generation d'un reçu en
-- environnement de developpement local.
--
-- Verifie en production (lecture seule, 10/08/2026) : le bucket "recus" existe
-- deja (public = false) avec 4 policies RLS (recus_storage_read/insert/update/
-- delete, deja presentes dans la migration 20260807120447). Cette migration ne
-- fait qu'ajouter la ligne manquante dans storage.buckets ; ON CONFLICT DO
-- NOTHING la rend sans effet si rejouee en production (le bucket y existe deja).

INSERT INTO storage.buckets (id, name, public)
VALUES ('recus', 'recus', false)
ON CONFLICT (id) DO NOTHING;
