-- Ajoute l'heure de début de la récréation matinale (durée déjà existante
-- via duree_recreation_min, jamais positionnée dans le temps jusqu'ici).
-- Défaut 09:45, cohérent avec duree_recreation_min = 15 (déjà en place).
ALTER TABLE public.parametres_emploi_temps
  ADD COLUMN recreation_debut time NOT NULL DEFAULT '09:45';
