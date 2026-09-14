CREATE OR REPLACE FUNCTION public.tg_bloquer_suppression_facture_avec_paiement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nb integer;
BEGIN
  SELECT count(*) INTO v_nb
  FROM public.paiements
  WHERE facture_id = OLD.id
    AND annule_le IS NULL;

  IF v_nb > 0 THEN
    RAISE EXCEPTION 'facture_avec_paiements_actifs'
      USING HINT = 'Annulez ou remboursez les encaissements de la facture ' || COALESCE(OLD.numero, '') || ' avant de la supprimer.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquer_suppression_facture_avec_paiement ON public.factures;
CREATE TRIGGER trg_bloquer_suppression_facture_avec_paiement
BEFORE DELETE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.tg_bloquer_suppression_facture_avec_paiement();