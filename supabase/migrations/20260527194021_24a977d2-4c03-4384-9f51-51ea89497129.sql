CREATE TYPE public.remplacement_statut AS ENUM ('a_pourvoir', 'en_attente', 'confirme', 'annule');

CREATE TABLE public.remplacements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  annee_id uuid REFERENCES public.annees_scolaires(id) ON DELETE SET NULL,
  date date NOT NULL,
  creneau_id uuid REFERENCES public.creneaux_emploi_temps(id) ON DELETE SET NULL,
  absent_enseignant_id uuid NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  remplacant_enseignant_id uuid REFERENCES public.enseignants(id) ON DELETE SET NULL,
  classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  matiere_id uuid REFERENCES public.matieres(id) ON DELETE SET NULL,
  heure_debut time,
  heure_fin time,
  motif text,
  statut public.remplacement_statut NOT NULL DEFAULT 'a_pourvoir',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_remplacements_ecole_date ON public.remplacements (ecole_id, date DESC);
CREATE INDEX idx_remplacements_absent ON public.remplacements (absent_enseignant_id);
CREATE INDEX idx_remplacements_remplacant ON public.remplacements (remplacant_enseignant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remplacements TO authenticated;
GRANT ALL ON public.remplacements TO service_role;

ALTER TABLE public.remplacements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture remplacements école"
ON public.remplacements FOR SELECT TO authenticated
USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "Admin/directeur insère remplacements"
ON public.remplacements FOR INSERT TO authenticated
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE POLICY "Admin/directeur met à jour remplacements"
ON public.remplacements FOR UPDATE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE POLICY "Admin/directeur supprime remplacements"
ON public.remplacements FOR DELETE TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role)
  OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role)
);

CREATE OR REPLACE FUNCTION public.tg_remplacements_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_remplacements_updated_at
BEFORE UPDATE ON public.remplacements
FOR EACH ROW EXECUTE FUNCTION public.tg_remplacements_set_updated_at();