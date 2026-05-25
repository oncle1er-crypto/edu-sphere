-- Rattacher le compte admin démo à un profil enseignant pour permettre la démo du portail
UPDATE public.enseignants
SET user_id = 'c99cc562-14e8-47e0-ba13-6b0973bdb97c'
WHERE id = 'e0e2adfc-a2a0-496e-b018-d12450214c1a';

-- Donner aussi le rôle enseignant à ce compte (en plus de admin)
INSERT INTO public.user_roles (user_id, ecole_id, role)
VALUES ('c99cc562-14e8-47e0-ba13-6b0973bdb97c', 'a0000000-0000-0000-0000-000000000001', 'enseignant')
ON CONFLICT DO NOTHING;