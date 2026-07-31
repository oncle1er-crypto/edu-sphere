-- Rattachement niveau (cycle) aux tables non liées à une classe
ALTER TABLE public.enseignants ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.matieres ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.salles ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.livres ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.lignes_transport ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.vehicules ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.chauffeurs ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.stocks_cantine ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.menus_cantine ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.cantine_personnel ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.lignes_budget ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.groupes_pedagogiques ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.sp_services ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.bons_reduction ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.grille_tarifs_niveaux ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;
ALTER TABLE public.grille_tarifs_services ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;

-- Restriction de niveau par utilisateur (NULL = tous les niveaux)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;

-- Clé de répartition des charges communes
ALTER TABLE public.finance_settings ADD COLUMN IF NOT EXISTS cle_repartition_commune text NOT NULL DEFAULT 'effectif';
ALTER TABLE public.finance_settings DROP CONSTRAINT IF EXISTS finance_settings_cle_repartition_commune_check;
ALTER TABLE public.finance_settings ADD CONSTRAINT finance_settings_cle_repartition_commune_check
  CHECK (cle_repartition_commune IN ('effectif', 'recettes', 'egalitaire'));

-- Index pour le filtrage par niveau
CREATE INDEX IF NOT EXISTS idx_enseignants_cycle ON public.enseignants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_matieres_cycle ON public.matieres(cycle_id);
CREATE INDEX IF NOT EXISTS idx_salles_cycle ON public.salles(cycle_id);
CREATE INDEX IF NOT EXISTS idx_livres_cycle ON public.livres(cycle_id);
CREATE INDEX IF NOT EXISTS idx_lignes_transport_cycle ON public.lignes_transport(cycle_id);
CREATE INDEX IF NOT EXISTS idx_vehicules_cycle ON public.vehicules(cycle_id);
CREATE INDEX IF NOT EXISTS idx_chauffeurs_cycle ON public.chauffeurs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_stocks_cantine_cycle ON public.stocks_cantine(cycle_id);
CREATE INDEX IF NOT EXISTS idx_menus_cantine_cycle ON public.menus_cantine(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cantine_personnel_cycle ON public.cantine_personnel(cycle_id);
CREATE INDEX IF NOT EXISTS idx_depenses_cycle ON public.depenses(cycle_id);
CREATE INDEX IF NOT EXISTS idx_lignes_budget_cycle ON public.lignes_budget(cycle_id);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_cycle ON public.fournisseurs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_groupes_pedagogiques_cycle ON public.groupes_pedagogiques(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sp_services_cycle ON public.sp_services(cycle_id);
CREATE INDEX IF NOT EXISTS idx_bons_reduction_cycle ON public.bons_reduction(cycle_id);
CREATE INDEX IF NOT EXISTS idx_grille_tarifs_niveaux_cycle ON public.grille_tarifs_niveaux(cycle_id);
CREATE INDEX IF NOT EXISTS idx_grille_tarifs_services_cycle ON public.grille_tarifs_services(cycle_id);
CREATE INDEX IF NOT EXISTS idx_classes_cycle_annee ON public.classes(cycle_id, annee_id);
CREATE INDEX IF NOT EXISTS idx_eleves_classe_annee ON public.eleves(classe_id, annee_id);