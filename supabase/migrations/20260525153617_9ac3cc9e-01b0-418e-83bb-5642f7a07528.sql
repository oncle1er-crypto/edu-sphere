
-- Add categorie to factures so transport/cantine billing can filter
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS categorie text NOT NULL DEFAULT 'scolarite';
CREATE INDEX IF NOT EXISTS factures_categorie_idx ON public.factures(ecole_id, categorie);

-- Chauffeurs table
CREATE TABLE IF NOT EXISTS public.chauffeurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  numero_permis text,
  date_expiration_permis date,
  vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE SET NULL,
  date_embauche date,
  statut text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecole_read" ON public.chauffeurs FOR SELECT TO authenticated
  USING (private.user_belongs_to_ecole(auth.uid(), ecole_id));

CREATE POLICY "ecole_write" ON public.chauffeurs FOR ALL TO authenticated
  USING (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role))
  WITH CHECK (private.has_ecole_role(auth.uid(), ecole_id, 'admin'::app_role) OR private.has_ecole_role(auth.uid(), ecole_id, 'directeur'::app_role));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
