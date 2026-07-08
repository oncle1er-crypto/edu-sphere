
REVOKE ALL ON FUNCTION public.recalc_vacances_eleve_statut(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_vacances_paiement_recalc() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_vacances_eleve_statut(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_vacances_paiement_recalc() TO service_role;
