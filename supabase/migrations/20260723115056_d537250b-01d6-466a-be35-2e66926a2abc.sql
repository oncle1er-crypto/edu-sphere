
DELETE FROM public.paiements WHERE facture_id IN ('111ebdd3-3da6-4cd7-ab03-a2fd86843288','5a17d498-2481-490e-a855-c9fb0e9e012d','abc4670e-9bb7-4934-abef-3e32fd6913c2');
DELETE FROM public.factures WHERE id IN ('111ebdd3-3da6-4cd7-ab03-a2fd86843288','5a17d498-2481-490e-a855-c9fb0e9e012d','abc4670e-9bb7-4934-abef-3e32fd6913c2');
DELETE FROM public.abonnements_cantine WHERE id='909f7a9c-1004-4082-bbf3-6149c97fe8e9';
