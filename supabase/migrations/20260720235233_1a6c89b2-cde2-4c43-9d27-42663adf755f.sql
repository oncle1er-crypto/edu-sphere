DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_paiements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_ventes_tenues; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_candidats; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_services; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.sp_paiements REPLICA IDENTITY FULL;
ALTER TABLE public.sp_ventes_tenues REPLICA IDENTITY FULL;
ALTER TABLE public.sp_candidats REPLICA IDENTITY FULL;
ALTER TABLE public.sp_services REPLICA IDENTITY FULL;