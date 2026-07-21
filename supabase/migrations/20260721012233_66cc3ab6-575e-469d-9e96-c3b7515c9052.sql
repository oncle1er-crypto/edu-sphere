CREATE OR REPLACE FUNCTION public.sp_supprimer_paiement(_paiement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Seul un administrateur peut supprimer un paiement';
  END IF;
  DELETE FROM public.sp_paiements WHERE id = _paiement_id;
END;
$$;