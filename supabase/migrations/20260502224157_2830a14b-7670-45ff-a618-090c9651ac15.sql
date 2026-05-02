
-- ==========================================
-- justifications
-- ==========================================
CREATE TABLE public.justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  presence_id uuid,
  motif text NOT NULL,
  piece_jointe text,
  statut text NOT NULL DEFAULT 'en_attente',
  traite_par uuid,
  date_traitement timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.justifications FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.justifications FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'));

-- ==========================================
-- retards
-- ==========================================
CREATE TABLE public.retards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  classe_id uuid,
  annee_id uuid,
  date_retard date NOT NULL DEFAULT CURRENT_DATE,
  heure_arrivee time,
  duree_minutes integer,
  motif text,
  enregistre_par uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.retards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.retards FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.retards FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'enseignant') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'enseignant') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'));

-- ==========================================
-- sanctions_presences
-- ==========================================
CREATE TABLE public.sanctions_presences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  classe_id uuid,
  annee_id uuid,
  type text NOT NULL DEFAULT 'avertissement',
  motif text,
  nb_absences_declencheur integer,
  date_sanction date NOT NULL DEFAULT CURRENT_DATE,
  notifie_parents boolean DEFAULT false,
  enregistre_par uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.sanctions_presences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.sanctions_presences FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.sanctions_presences FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'));

-- ==========================================
-- notifications_parents
-- ==========================================
CREATE TABLE public.notifications_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL,
  eleve_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'absence',
  canal text NOT NULL DEFAULT 'sms',
  message text,
  destinataire text,
  envoye_par uuid,
  date_envoi timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications_parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecole_read" ON public.notifications_parents FOR SELECT TO authenticated
  USING (user_belongs_to_ecole(auth.uid(), ecole_id));
CREATE POLICY "ecole_write" ON public.notifications_parents FOR ALL TO authenticated
  USING (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'))
  WITH CHECK (has_ecole_role(auth.uid(), ecole_id, 'admin') OR has_ecole_role(auth.uid(), ecole_id, 'directeur') OR has_ecole_role(auth.uid(), ecole_id, 'surveillant'));
