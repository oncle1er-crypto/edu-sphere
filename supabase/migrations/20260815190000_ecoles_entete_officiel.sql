-- En-tête officiel de l'école, pour les documents administratifs formels
-- (ex. fiche de paiement à faire signer par un bénéficiaire) qui doivent
-- reproduire les mentions institutionnelles ivoiriennes : Ministère de
-- tutelle, DRENET/DDENET de rattachement, devise nationale, armoiries.
-- Saisi une fois dans Paramètres > Profil de l'école (SchoolProfile.tsx),
-- réutilisable pour tout futur document officiel — pas retapé à chaque
-- génération.
--
-- ecoles.ville et ecoles.directeur existent déjà et sont réutilisés tels
-- quels pour "Fait à {ville}, le ..." et la signature du directeur.

ALTER TABLE public.ecoles
  ADD COLUMN IF NOT EXISTS ministere text,
  ADD COLUMN IF NOT EXISTS drenet text,
  ADD COLUMN IF NOT EXISTS ddenet text,
  ADD COLUMN IF NOT EXISTS devise_nationale text DEFAULT 'Union - Discipline - Travail',
  ADD COLUMN IF NOT EXISTS armoiries_url text;
