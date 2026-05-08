
-- 1. Nouvelle valeur par défaut
ALTER TABLE public.eleves ALTER COLUMN statut SET DEFAULT 'pre_inscrit';

-- 2. Fonction : vérifie complétude et promeut pre_inscrit -> inscrit
CREATE OR REPLACE FUNCTION public.check_and_promote_eleve(_eleve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _eleve RECORD;
  _nb_docs_required INT;
  _nb_docs INT;
  _has_payment BOOLEAN;
BEGIN
  SELECT id, ecole_id, classe_id, statut INTO _eleve
  FROM eleves WHERE id = _eleve_id;
  IF NOT FOUND OR _eleve.statut <> 'pre_inscrit' THEN
    RETURN;
  END IF;

  SELECT COALESCE(nb_documents_obligatoires, 3) INTO _nb_docs_required
  FROM config_module_eleves WHERE ecole_id = _eleve.ecole_id LIMIT 1;
  IF _nb_docs_required IS NULL THEN _nb_docs_required := 3; END IF;

  SELECT COUNT(*) INTO _nb_docs FROM documents_eleves WHERE eleve_id = _eleve_id;

  SELECT EXISTS(
    SELECT 1 FROM factures WHERE eleve_id = _eleve_id AND montant_paye > 0
  ) INTO _has_payment;

  IF _eleve.classe_id IS NOT NULL AND _nb_docs >= _nb_docs_required AND _has_payment THEN
    UPDATE eleves SET statut = 'inscrit', updated_at = now() WHERE id = _eleve_id;
  END IF;
END;
$$;

-- 3. Triggers
CREATE OR REPLACE FUNCTION public.trg_promote_on_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_and_promote_eleve(NEW.eleve_id); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS promote_eleve_on_doc ON public.documents_eleves;
CREATE TRIGGER promote_eleve_on_doc
AFTER INSERT ON public.documents_eleves
FOR EACH ROW EXECUTE FUNCTION public.trg_promote_on_document();

CREATE OR REPLACE FUNCTION public.trg_promote_on_facture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.montant_paye > 0 THEN PERFORM public.check_and_promote_eleve(NEW.eleve_id); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS promote_eleve_on_facture ON public.factures;
CREATE TRIGGER promote_eleve_on_facture
AFTER INSERT OR UPDATE OF montant_paye ON public.factures
FOR EACH ROW EXECUTE FUNCTION public.trg_promote_on_facture();

CREATE OR REPLACE FUNCTION public.trg_promote_on_classe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.classe_id IS NOT NULL AND (OLD.classe_id IS NULL OR OLD.classe_id <> NEW.classe_id) THEN
    PERFORM public.check_and_promote_eleve(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS promote_eleve_on_classe ON public.eleves;
CREATE TRIGGER promote_eleve_on_classe
AFTER UPDATE OF classe_id ON public.eleves
FOR EACH ROW EXECUTE FUNCTION public.trg_promote_on_classe();
