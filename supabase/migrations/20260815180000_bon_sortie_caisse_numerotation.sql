-- Bon de sortie de caisse : numérotation séquentielle formelle des dépenses
-- validées, au format BSC-YYYY-00001 (préfixe distinct de BS-YYYY-00001 déjà
-- utilisé par billets_sortie — module Vie scolaire, autorisations de sortie
-- d'élève/personnel — pour éviter toute confusion entre les deux documents).
--
-- Contrairement à billets_sortie.numero (généré par DEFAULT à l'INSERT, car
-- le billet existe dès sa création), le bon de sortie de caisse ne doit être
-- numéroté qu'au moment où la dépense est VALIDÉE (statut passe à 'validee'),
-- pas à sa création en 'en_attente'. On utilise donc un trigger plutôt qu'un
-- DEFAULT de colonne.
--
-- Une fois assigné, le numéro n'est jamais réassigné (garde IS NULL) : si une
-- dépense validée est réouverte puis re-validée (reouvrirDepense /
-- validerDepense dans useDepenses.ts), elle conserve le même numéro de bon —
-- cohérent avec un usage de pièce comptable numérotée à usage unique.

CREATE SEQUENCE IF NOT EXISTS public.seq_bon_sortie_caisse START 1;

ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS numero_bon_sortie text;

CREATE OR REPLACE FUNCTION public.assign_numero_bon_sortie()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.statut = 'validee' AND NEW.numero_bon_sortie IS NULL THEN
    NEW.numero_bon_sortie := 'BSC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_bon_sortie_caisse')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_depenses_numero_bon_sortie ON public.depenses;
CREATE TRIGGER trg_depenses_numero_bon_sortie
  BEFORE INSERT OR UPDATE ON public.depenses
  FOR EACH ROW EXECUTE FUNCTION public.assign_numero_bon_sortie();

-- Backfill : les dépenses déjà 'validee' avant cette migration ne seront plus
-- jamais re-UPDATEées avec statut='validee' (le trigger ne se déclenche que
-- sur une transition), donc elles resteraient sans numéro indéfiniment sans
-- ce rattrapage explicite. Ordre chronologique (date de validation, sinon
-- date de création) préservé via une boucle plutôt qu'un UPDATE ensembliste,
-- pour garantir l'ordre d'assignation des numéros.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.depenses
    WHERE statut = 'validee' AND numero_bon_sortie IS NULL
    ORDER BY valide_le NULLS LAST, created_at
  LOOP
    UPDATE public.depenses
    SET numero_bon_sortie = 'BSC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_bon_sortie_caisse')::text, 5, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
