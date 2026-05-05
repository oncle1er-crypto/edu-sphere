
CREATE TABLE public.finance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecole_id UUID NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  devise TEXT NOT NULL DEFAULT 'XAF',
  position_symbole TEXT NOT NULL DEFAULT 'after',
  taux_tva NUMERIC NOT NULL DEFAULT 0,
  banque TEXT DEFAULT '',
  rib TEXT DEFAULT '',
  numero_momo TEXT DEFAULT '',
  numero_om TEXT DEFAULT '',
  prefixe_facture TEXT DEFAULT 'FAC-2025-',
  prochain_numero_facture INTEGER DEFAULT 1,
  prefixe_recu TEXT DEFAULT 'REC-2025-',
  modes_paiement TEXT[] DEFAULT ARRAY['cash','momo','om','bank'],
  rappel_auto BOOLEAN DEFAULT true,
  penalite_retard NUMERIC DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ecole_id)
);

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view finance settings of their school"
ON public.finance_settings FOR SELECT TO authenticated
USING (ecole_id = public.get_user_ecole_id());

CREATE POLICY "Users can insert finance settings for their school"
ON public.finance_settings FOR INSERT TO authenticated
WITH CHECK (ecole_id = public.get_user_ecole_id());

CREATE POLICY "Users can update finance settings of their school"
ON public.finance_settings FOR UPDATE TO authenticated
USING (ecole_id = public.get_user_ecole_id());

CREATE TRIGGER update_finance_settings_updated_at
BEFORE UPDATE ON public.finance_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
