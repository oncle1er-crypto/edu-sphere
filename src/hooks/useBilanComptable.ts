import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useFinanceSettings } from "@/hooks/useFinanceSettings";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { ventilerScolarite, type VentilationParams } from "@/lib/ventilationScolarite";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";

export interface BilanLigne {
  libelle: string;
  /** 12 valeurs, alignées sur `mois` */
  valeurs: number[];
  total: number;
}

export interface BilanMois {
  /** ex. "SEPTEMBRE" */
  label: string;
  /** ex. "SEPT." */
  court: string;
  /** clé YYYY-MM */
  key: string;
}

export interface BilanComptable {
  mois: BilanMois[];
  entrees: BilanLigne[];
  sorties: BilanLigne[];
  totalEntrees: BilanLigne;
  totalSorties: BilanLigne;
  solde: BilanLigne;
  soldeCumule: number[];
  /** Tous les mois de l'exercice (avant filtrage période) */
  moisExercice: BilanMois[];
  /** Découpage en trimestres : indices de colonnes */
  trimestres: { label: string; from: number; to: number }[];
}

export type BilanPeriode =
  | { mode: "annee" }
  | { mode: "trimestre"; index: number }
  | { mode: "mois"; index: number };

const MOIS_LABELS = [
  "JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE",
];

const ENTREES_LIBELLES = [
  "Frais de scolarité",
  "Frais d'inscription et de réinscription",
  "Frais de cantine",
  "Frais de transport scolaire",
  "Frais d'uniformes ou de fournitures",
  "Les activités extrascolaires",
  "Cours de vacances",
  "Autres services ponctuels",
] as const;

type EntreeKey = (typeof ENTREES_LIBELLES)[number];

/** Nombre de mois d'anticipation avant la rentrée (inscriptions anticipées) */
const MOIS_ANTICIPATION = 2;

function buildMois(debut: string, fin: string): BilanMois[] {
  const d = new Date(debut);
  const f = new Date(fin);
  const start = new Date(d.getFullYear(), d.getMonth() - MOIS_ANTICIPATION, 1);
  const nb =
    (f.getFullYear() - start.getFullYear()) * 12 + (f.getMonth() - start.getMonth()) + 1;
  const out: BilanMois[] = [];
  for (let i = 0; i < Math.max(1, nb); i++) {
    const m = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const label = MOIS_LABELS[m.getMonth()];
    out.push({
      label,
      court: label.slice(0, 4),
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return out;
}

const monthKey = (date?: string | null) => (date ? String(date).slice(0, 7) : null);

export function useBilanComptable(periode: BilanPeriode = { mode: "annee" }) {
  const { ecoleId } = useEcoleId();
  const { activeAnnee } = useAcademicPeriod();
  const { settings } = useFinanceSettings();
  const { niveau, isGlobal, keepEleve, keepClasse, matchesCycle } = useNiveauFilters();

  const params: VentilationParams = {
    fraisInscription: Number(settings.frais_inscription) || 0,
    fraisUniformes: Number(settings.frais_uniformes) || 0,
    fraisActivites: Number(settings.frais_activites) || 0,
  };

  return useQuery<BilanComptable>({
    queryKey: ["bilan_comptable", ecoleId, activeAnnee?.id, params, periode, niveau],
    enabled: !!ecoleId && !!activeAnnee,
    queryFn: async () => {
      const mois = buildMois(activeAnnee!.debut, activeAnnee!.fin);
      const nbMois = mois.length;
      const idx = new Map(mois.map((m, i) => [m.key, i]));
      const zeros = () => Array(nbMois).fill(0) as number[];

      /** Index de colonne, borné aux limites de l'exercice (rien n'est perdu) */
      const colIndex = (date?: string | null): number | undefined => {
        const mk = monthKey(date);
        if (!mk) return undefined;
        const hit = idx.get(mk);
        if (hit !== undefined) return hit;
        if (mk < mois[0].key) return 0;
        if (mk > mois[nbMois - 1].key) return nbMois - 1;
        return undefined;
      };

      const from = mois[0].key + "-01";
      const to = activeAnnee!.fin;


      // ── Tranches de scolarité de l'année (total dû par élève) ──
      const { data: tranches } = await supabase
        .from("tranches")
        .select("id, eleve_id, montant, frais_scolarite!inner(annee_id)")
        .eq("ecole_id", ecoleId!)
        .eq("frais_scolarite.annee_id", activeAnnee!.id);

      const totalDuParEleve = new Map<string, number>();
      const trancheIds = new Set<string>();
      for (const t of (tranches ?? []) as any[]) {
        if (!keepEleve(t.eleve_id)) continue;
        trancheIds.add(t.id);
        totalDuParEleve.set(t.eleve_id, (totalDuParEleve.get(t.eleve_id) ?? 0) + Number(t.montant || 0));
      }

      // ── Encaissements scolarité + factures de services ──
      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant, date_paiement, eleve_id, tranche_id, facture_id, factures(categorie)")
        .eq("ecole_id", ecoleId!)
        .is("annule_le", null)
        .gte("date_paiement", from)
        .lte("date_paiement", to)
        .order("date_paiement", { ascending: true });

      const entrees: Record<EntreeKey, number[]> = Object.fromEntries(
        ENTREES_LIBELLES.map((l) => [l, zeros()]),
      ) as Record<EntreeKey, number[]>;

      // Ventilation des versements de scolarité par élève, en ordre chronologique
      const parEleve = new Map<string, any[]>();
      for (const p of (paiements ?? []) as any[]) {
        if (!keepEleve(p.eleve_id)) continue;
        const i = colIndex(p.date_paiement);
        if (i === undefined) continue;

        if (p.tranche_id && trancheIds.has(p.tranche_id)) {
          const list = parEleve.get(p.eleve_id) ?? [];
          list.push(p);
          parEleve.set(p.eleve_id, list);
          continue;
        }
        const cat = p.factures?.categorie;
        if (cat === "cantine") entrees["Frais de cantine"][i] += Number(p.montant || 0);
        else if (cat === "transport") entrees["Frais de transport scolaire"][i] += Number(p.montant || 0);
      }

      for (const [eleveId, list] of parEleve) {
        const totalDu = totalDuParEleve.get(eleveId) ?? list.reduce((s, p) => s + Number(p.montant || 0), 0);
        let cumul = 0;
        for (const p of list) {
          const i = colIndex(p.date_paiement)!;
          const m = Number(p.montant || 0);
          const avant = ventilerScolarite(totalDu, cumul, params);
          const apres = ventilerScolarite(totalDu, cumul + m, params);
          cumul += m;

          const diff = (cle: string) =>
            (apres.postes.find((x) => x.cle === cle)?.affecte ?? 0) -
            (avant.postes.find((x) => x.cle === cle)?.affecte ?? 0);
          const diffAnnexe = (n: number) =>
            (apres.detailAnnexes[n]?.affecte ?? 0) - (avant.detailAnnexes[n]?.affecte ?? 0);

          entrees["Frais d'inscription et de réinscription"][i] += diff("inscription");
          entrees["Frais de scolarité"][i] += diff("scolarite");
          entrees["Frais d'uniformes ou de fournitures"][i] += diffAnnexe(0);
          entrees["Les activités extrascolaires"][i] += diffAnnexe(1);

          // Trop-perçu éventuel : rattaché aux frais de scolarité pour rester en trésorerie
          const ventile = diff("inscription") + diff("scolarite") + diff("annexes");
          if (m - ventile > 0.5) entrees["Frais de scolarité"][i] += m - ventile;
        }
      }

      // ── Encaissements cantine / transport (échéancier services) ──
      const { data: paiementsServices } = await supabase
        .from("paiements_services")
        .select("montant, service_type, created_at")
        .eq("ecole_id", ecoleId!)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`);
      for (const p of (paiementsServices ?? []) as any[]) {
        const i = colIndex(p.created_at);
        if (i === undefined) continue;
        const key: EntreeKey =
          p.service_type === "transport" ? "Frais de transport scolaire" : "Frais de cantine";
        entrees[key][i] += Number(p.montant || 0);
      }

      // ── Services ponctuels (tenues, tests d'entrée…) ──
      const [{ data: services }, { data: spPaiements }] = await Promise.all([
        supabase.from("sp_services").select("id, slug, nom").eq("ecole_id", ecoleId!),
        supabase
          .from("sp_paiements")
          .select("montant_paye, date_paiement, service_id, annule_le")
          .eq("ecole_id", ecoleId!)
          .is("annule_le", null)
          .gte("date_paiement", from)
          .lte("date_paiement", to),
      ]);
      const slugById = new Map(((services ?? []) as any[]).map((s) => [s.id, `${s.slug} ${s.nom}`.toLowerCase()]));
      for (const p of (spPaiements ?? []) as any[]) {
        const i = colIndex(p.date_paiement);
        if (i === undefined) continue;
        const s = slugById.get(p.service_id) ?? "";
        const key: EntreeKey = /tenue|uniforme|fourniture/.test(s)
          ? "Frais d'uniformes ou de fournitures"
          : "Autres services ponctuels";
        entrees[key][i] += Number(p.montant_paye || 0);
      }

      // ── Cours de vacances ──
      const { data: vac } = await supabase
        .from("vacances_paiements")
        .select("montant_paye, date_paiement")
        .eq("ecole_id", ecoleId!)
        .gte("date_paiement", from)
        .lte("date_paiement", to);
      for (const p of (vac ?? []) as any[]) {
        const i = colIndex(p.date_paiement);
        if (i === undefined) continue;
        entrees["Cours de vacances"][i] += Number(p.montant_paye || 0);
      }

      // ── Sorties : dépenses par catégorie ──
      const { data: depenses } = await supabase
        .from("depenses")
        .select("montant, categorie, date_depense, statut")
        .eq("ecole_id", ecoleId!)
        .gte("date_depense", from)
        .lte("date_depense", to);

      const sortiesMap = new Map<string, number[]>();
      for (const d of (depenses ?? []) as any[]) {
        if (["rejetee", "annulee"].includes(String(d.statut))) continue;
        const i = colIndex(d.date_depense);
        if (i === undefined) continue;
        const cat = EXPENSE_CATEGORIES.includes(d.categorie) ? d.categorie : "Autres charges";
        if (!sortiesMap.has(cat)) sortiesMap.set(cat, zeros());
        sortiesMap.get(cat)![i] += Number(d.montant || 0);
      }

      const mkLigne = (libelle: string, valeurs: number[]): BilanLigne => ({
        libelle,
        valeurs: valeurs.map((v) => Math.round(v)),
        total: Math.round(valeurs.reduce((s, v) => s + v, 0)),
      });

      const lignesEntrees = ENTREES_LIBELLES.map((l) => mkLigne(l, entrees[l])).filter(
        (l) => l.total !== 0 || ENTREES_LIBELLES.indexOf(l.libelle as EntreeKey) < 6,
      );

      const ordreSorties = [...EXPENSE_CATEGORIES, "Autres charges"];
      const lignesSorties = ordreSorties
        .filter((c) => sortiesMap.has(c))
        .map((c) => mkLigne(c, sortiesMap.get(c)!));

      const sum = (rows: BilanLigne[]) =>
        rows.reduce((acc, r) => acc.map((v, i) => v + r.valeurs[i]), zeros());

      const te = sum(lignesEntrees);
      const ts = sum(lignesSorties);
      const so = te.map((v, i) => v - ts[i]);
      let run = 0;
      const soldeCumuleFull = so.map((v) => (run += v));

      // ── Découpage en trimestres (3 blocs de colonnes) ──
      const taille = Math.ceil(nbMois / 3);
      const trimestres = [0, 1, 2]
        .map((t) => {
          const f = t * taille;
          const l = Math.min(nbMois - 1, f + taille - 1);
          return {
            label: `T${t + 1} — ${mois[f]?.label ?? ""} à ${mois[l]?.label ?? ""}`,
            from: f,
            to: l,
          };
        })
        .filter((t) => t.from < nbMois);

      // ── Restriction à la période choisie ──
      let f = 0;
      let l = nbMois - 1;
      if (periode.mode === "trimestre") {
        const t = trimestres[Math.min(periode.index, trimestres.length - 1)];
        if (t) { f = t.from; l = t.to; }
      } else if (periode.mode === "mois") {
        f = Math.min(Math.max(0, periode.index), nbMois - 1);
        l = f;
      }

      const slice = (r: BilanLigne): BilanLigne => {
        const valeurs = r.valeurs.slice(f, l + 1);
        return { libelle: r.libelle, valeurs, total: valeurs.reduce((s, v) => s + v, 0) };
      };

      return {
        mois: mois.slice(f, l + 1),
        moisExercice: mois,
        trimestres,
        entrees: lignesEntrees.map(slice),
        sorties: lignesSorties.map(slice).filter((r) => r.total !== 0),
        totalEntrees: slice(mkLigne("TOTAL ENTRÉES", te)),
        totalSorties: slice(mkLigne("TOTAL SORTIES", ts)),
        solde: slice(mkLigne("SOLDE DE CAISSE", so)),
        soldeCumule: soldeCumuleFull.slice(f, l + 1),
      };

    },
  });
}
