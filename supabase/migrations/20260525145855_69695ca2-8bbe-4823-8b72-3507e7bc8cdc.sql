-- Rattacher le compte admin démo à un profil enseignant pour permettre la démo du portail
UPDATE public.enseignants
SET user_id = 'c99cc562-14e8-47e0-ba13-6b0973bdb97c'
WHERE id = 'e0e2adfc-a2a0-496e-b018-d12450214c1a'
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = 'c99cc562-14e8-47e0-ba13-6b0973bdb97c');

-- Donner aussi le rôle enseignant à ce compte (en plus de admin)
-- Rendu conditionnel : ces UUID sont des données historiques de production ; sur une base
-- vierge (dev local, CI) l'utilisateur et l'école n'existent pas et l'INSERT violerait les
-- clés étrangères user_roles.user_id -> auth.users et user_roles.ecole_id -> public.ecoles.
INSERT INTO public.user_roles (user_id, ecole_id, role)
SELECT 'c99cc562-14e8-47e0-ba13-6b0973bdb97c', 'a0000000-0000-0000-0000-000000000001', 'enseignant'
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = 'c99cc562-14e8-47e0-ba13-6b0973bdb97c')
  AND EXISTS (SELECT 1 FROM public.ecoles e WHERE e.id = 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
