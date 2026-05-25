
REVOKE ALL ON FUNCTION public.enregistrer_paiement(uuid, uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_paiement(uuid, uuid, uuid, numeric, text, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.reconcilier_tranche_paiements() FROM PUBLIC, anon, authenticated;
