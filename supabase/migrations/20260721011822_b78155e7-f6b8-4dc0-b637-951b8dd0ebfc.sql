
-- 1) Lien vente ↔ paiement
ALTER TABLE public.sp_ventes_tenues
  ADD COLUMN IF NOT EXISTS paiement_id uuid REFERENCES public.sp_paiements(id) ON DELETE SET NULL;

-- 2) Fonction: annuler une vente ET son paiement lié
CREATE OR REPLACE FUNCTION public.sp_annuler_vente(_vente_id uuid, _motif text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_paiement uuid;
BEGIN
  UPDATE public.sp_ventes_tenues
     SET statut = 'annule', annule_le = now(), motif_annulation = _motif
   WHERE id = _vente_id
   RETURNING paiement_id INTO v_paiement;

  IF v_paiement IS NOT NULL THEN
    UPDATE public.sp_paiements
       SET annule_le = now(), motif_annulation = COALESCE(motif_annulation, _motif)
     WHERE id = v_paiement AND annule_le IS NULL;
  END IF;
END;
$$;

-- 3) Fonction: suppression définitive d'un paiement (admin uniquement)
CREATE OR REPLACE FUNCTION public.sp_supprimer_paiement(_paiement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seul un administrateur peut supprimer un paiement';
  END IF;
  DELETE FROM public.sp_paiements WHERE id = _paiement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_annuler_vente(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sp_supprimer_paiement(uuid) TO authenticated;
