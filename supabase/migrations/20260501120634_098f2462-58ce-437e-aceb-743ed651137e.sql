
-- Le compte historique doit recevoir un secret non prédictible lors d'un
-- reset local. Aucun mot de passe utilisable ne doit être versionné.
UPDATE auth.users 
SET encrypted_password = crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf'))
WHERE email = 'admin@gsp.ci';
