
REVOKE EXECUTE ON FUNCTION public.generer_tranches_eleve(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generer_tranches_pour_frais(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_generer_tranches_eleve() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_generer_tranches_frais() FROM PUBLIC, anon, authenticated;
