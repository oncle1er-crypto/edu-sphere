## Diagnostic

**KONAN KOUADIO NEHEMI** (matricule `GSP2526-CE2-022`) reste `pré_inscrit` malgré **175 000 FCFA** encaissés en 4 paiements. La requête DB confirme la cause exacte :

- La fonction `check_and_promote_eleve` (SECURITY DEFINER) vérifie le paiement via `SELECT SUM(montant_paye) FROM factures WHERE eleve_id = …`.
- Or les paiements réels de cet élève sont enregistrés dans la table `paiements` — la table `factures` retourne 0 pour lui (les factures ne sont pas systématiquement créées / `montant_paye` pas synchronisé).
- Résultat : `v_paid = 0` → aucune promotion, même après 4 encaissements.

**Autres élèves dans le même cas** : **16 élèves pré-inscrits au total** ont au moins un paiement enregistré et devraient être promus « inscrit ». Extraits :

| Matricule | Nom | Total payé | Nb paiements |
|---|---|---:|---:|
| GSP2526-CE2-022 | KONAN KOUADIO NEHEMI | 175 000 | 4 |
| GSP2526-CP2-019 | KOUASSI ASSENA MARIE EMMANUELLE | 165 000 | 3 |
| GSP2526-CP2-020 | KOUASSI OFIMIEN PAUL EMMANUELLA | 165 000 | 3 |
| ELV-261693 | DIARRA SAÏD ADIL | 100 000 | 3 |
| ELV-266502 | DIARRA N'GOLO AL-HOUSSAÏNE | 100 000 | 3 |
| ELV-267102 | ADJOBI SOUMAYE VINCENT BLANCHARD | 100 000 | 2 |
| ELV-269712 | ASSAMBAN MARIE PHILATEY | 100 000 | 2 |
| ELV-265170 | TANO AYA ELVYRA NOURAH MARIA | 80 000 | 1 |
| ELV-264832 | TANO MOAYE ACSA KETYANE | 80 000 | 1 |
| ELV-268909 | AHOULOU KIDIAM | 50 000 | 1 |
| ELV-263056 | AHOULOU OHPE MEGANE | 50 000 | 1 |
| GSP2526-CP1-007 | BAZIE KERIANE IRAÏS AKOUA | 20 000 | 1 |
| GSP2526-CP2-017 | KOUADIO N'DA N'GOUAN MICHEL PAUL-MARIE | 20 000 | 1 |
| GSP2526-GS-004 | AKA MOAHE MARIE EXAUCEE | 20 000 | 1 |
| ELV-263482 | AHININ AFFOUE YEDIDIA KEREN | 10 000 | 1 |

À noter : le cas KONAN présente aussi un **doublon** (deux fiches même matricule — l'autre est déjà « inscrit » avec 0 paiement en classe différente), à traiter à part.

## Correctifs proposés

### 1. Corriger `check_and_promote_eleve` (source du bug)
Remplacer la vérification `factures.montant_paye` par la somme réelle des encaissements :

```sql
SELECT COALESCE(SUM(p.montant),0) INTO v_paid
FROM public.paiements p
WHERE p.eleve_id = _eleve_id
  AND p.mode NOT IN ('remise','bourse','prise_en_charge'); -- cash uniquement
```

Garde la logique existante (classe requise, docs obligatoires si définis).

### 2. Ajouter un trigger sur `paiements`
Aujourd'hui la promotion n'est déclenchée que par `factures` / `documents_eleves` / `eleves.classe_id`. Ajouter :

```sql
CREATE TRIGGER promote_eleve_on_paiement
AFTER INSERT ON public.paiements
FOR EACH ROW EXECUTE FUNCTION trg_promote_on_paiement();
```

où `trg_promote_on_paiement` appelle `check_and_promote_eleve(NEW.eleve_id)`.

### 3. Rattrapage rétroactif
Dans la même migration, exécuter :

```sql
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT e.id FROM public.eleves e
    WHERE e.statut = 'pre_inscrit'
      AND EXISTS (SELECT 1 FROM public.paiements p WHERE p.eleve_id = e.id)
  LOOP
    PERFORM public.check_and_promote_eleve(r.id);
  END LOOP;
END $$;
```

→ promeut immédiatement les 16 élèves listés (sous réserve qu'ils aient une classe, ce qui est vérifié par la fonction).

### 4. Doublon KONAN (hors périmètre auto)
Deux fiches avec le même matricule `GSP2526-CE2-022`. Je te le signale mais **je ne fusionne rien sans validation** — dis-moi laquelle garder (celle avec les 175 000 FCFA payés, l'autre étant vide) et je nettoie dans un second lot.

## Vérification
- Après migration : re-requête `SELECT count(*) FROM eleves WHERE statut='pre_inscrit' AND EXISTS(SELECT 1 FROM paiements WHERE eleve_id=eleves.id)` → doit renvoyer 0 (hors élèves sans classe).
- Vérifier dans l'UI que KONAN passe en « Inscrit ».