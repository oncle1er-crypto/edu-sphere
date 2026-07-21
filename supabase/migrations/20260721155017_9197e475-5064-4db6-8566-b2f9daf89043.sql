ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_envoye_par_fkey;
ALTER TABLE public.sms_logs ADD CONSTRAINT sms_logs_envoye_par_fkey
  FOREIGN KEY (envoye_par) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.paiements DROP CONSTRAINT IF EXISTS paiements_recu_par_fkey;
ALTER TABLE public.paiements ADD CONSTRAINT paiements_recu_par_fkey
  FOREIGN KEY (recu_par) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.presences DROP CONSTRAINT IF EXISTS presences_enregistre_par_fkey;
ALTER TABLE public.presences ADD CONSTRAINT presences_enregistre_par_fkey
  FOREIGN KEY (enregistre_par) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.relances DROP CONSTRAINT IF EXISTS relances_envoye_par_fkey;
ALTER TABLE public.relances ADD CONSTRAINT relances_envoye_par_fkey
  FOREIGN KEY (envoye_par) REFERENCES auth.users(id) ON DELETE SET NULL;