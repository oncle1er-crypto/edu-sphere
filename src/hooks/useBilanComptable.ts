import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useFinanceSettings } from "@/hooks/useFinanceSettings";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { ventilerScolarite, type VentilationParams } from "@/lib/ventilationScolarite";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import { modeMeta } from "@/pages/finances/scolarite-data";

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

export interface BilanModeLigne {
  label: string;
  count: number;
  total: number;
}

export interface BilanComptable {
  mois: BilanMois[];
  entrees: BilanLigne[];
  sorties: BilanLigne[];
  totalEntrees: BilanLigne;
  totalSorties: BilanLigne;
  solde: BilanLigne;
  soldeCumule: number[];
  /** Ligne "SOLDE CUMULÉ" alignée sur la période affichée */
  soldeCumuleLigne: BilanLigne;
  /** Synthèse de la période affichée */
  bilan: { entrees: number; sorties: number; net: number; ouverture: number; cloture: number };
  /** Remises accordées sur la période (hors trésorerie) */
  remises: { total: number; nbEleves: number };
  /** Répartition des encaissements par mode de paiement */
  modes: BilanModeLigne[];
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

      // ── Répartition par mode de paiement (tous encaissements réels) ──
      const modesMap = new Map<string, { count: number; total: number }>();
      const addMode = (mode: string | null | undefined, montant: number) => {
        const meta = modeMeta(String(mode ?? ""));
        if (meta.kind !== "encaissement") return;
        const cur = modesMap.get(meta.label) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += montant;
        modesMap.set(meta.label, cur);
      };

      // ── Encaissements scolarité + factures de services ──
      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant, mode, date_paiement, eleve_id, tranche_id, facture_id, factures(categorie)")
        .eq("ecole_id", ecoleId!)
        .is("annule_le", null)
        .gte("date_paiement", from)
        .lte("date_paiement", to)
        .order("date_paiement", { ascending: true });

      const entrees: Record<EntreeKey, number[]> = Object.fromEntries(
        ENTREES_LIBELLES.map((l) => [l, zeros()]),
      ) as Record<EntreeKey, number[]>;

      // Remises / bourses : appliquées à la couverture du dû, mais hors trésorerie
      let remisesTotal = 0;
      const remisesEleves = new Set<string>();

      // Ventilation des versements de scolarité par élève, en ordre chronologique
      const parEleve = new Map<string, any[]>();
      for (const p of (paiements ?? []) as any[]) {
        if (!keepEleve(p.eleve_id)) continue;
        const i = colIndex(p.date_paiement);
        if (i === undefined) continue;
        const isRemise = modeMeta(String(p.mode ?? "")).kind === "remise";
        if (isRemise) {
          remisesTotal += Number(p.montant || 0);
          if (p.eleve_id) remisesEleves.add(p.eleve_id);
        } else {
          addMode(p.mode, Number(p.montant || 0));
        }

        if (p.tranche_id && trancheIds.has(p.tranche_id)) {
          const list = parEleve.get(p.eleve_id) ?? [];
          list.push(p);
          parEleve.set(p.eleve_id, list);
          continue;
        }
        if (isRemise) continue;
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
          const isRemise = modeMeta(String(p.mode ?? "")).kind === "remise";
          const avant = ventilerScolarite(totalDu, cumul, params);
          const apres = ventilerScolarite(totalDu, cumul + m, params);
          cumul += m;
          // Une remise consomme du dû (elle décale la ventilation des versements
          // suivants) mais n'entre jamais dans la trésorerie.
          if (isRemise) continue;

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
        .select("montant, mode, service_type, created_at, eleve_id")
        .eq("ecole_id", ecoleId!)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`);
      for (const p of (paiementsServices ?? []) as any[]) {
        if (!keepEleve(p.eleve_id)) continue;
        const i = colIndex(p.created_at);
        if (i === undefined) continue;
        const key: EntreeKey =
          p.service_type === "transport" ? "Frais de transport scolaire" : "Frais de cantine";
        entrees[key][i] += Number(p.montant || 0);
        addMode(p.mode, Number(p.montant || 0));
      }

      // ── Services ponctuels (tenues, tests d'entrée…) ──
      const [{ data: services }, { data: spPaiements }] = await Promise.all([
        supabase.from("sp_services").select("id, slug, nom").eq("ecole_id", ecoleId!),
        supabase
          .from("sp_paiements")
          .select("montant_paye, mode_paiement, date_paiement, service_id, annule_le, eleve_id, sp_candidats(classe_demandee_id)")
          .eq("ecole_id", ecoleId!)
          .is("annule_le", null)
          .gte("date_paiement", from)
          .lte("date_paiement", to),
      ]);
      const slugById = new Map(((services ?? []) as any[]).map((s) => [s.id, `${s.slug} ${s.nom}`.toLowerCase()]));
      for (const p of (spPaiements ?? []) as any[]) {
        if (!isGlobal) {
          const ok = p.eleve_id
            ? keepEleve(p.eleve_id)
            : keepClasse(p.sp_candidats?.classe_demandee_id);
          if (!ok) continue;
        }
        const i = colIndex(p.date_paiement);
        if (i === undefined) continue;
        const s = slugById.get(p.service_id) ?? "";
        const key: EntreeKey = /tenue|uniforme|fourniture/.test(s)
          ? "Frais d'uniformes ou de fournitures"
          : "Autres services ponctuels";
        entrees[key][i] += Number(p.montant_paye || 0);
        addMode(p.mode_paiement, Number(p.montant_paye || 0));
      }

      // ── Cours de vacances ──
      const { data: vac } = await supabase
        .from("vacances_paiements")
        .select("montant_paye, mode, date_paiement, eleve_id")
        .eq("ecole_id", ecoleId!)
        .gte("date_paiement", from)
        .lte("date_paiement", to);
      for (const p of (vac ?? []) as any[]) {
        if (!keepEleve(p.eleve_id)) continue;
        const i = colIndex(p.date_paiement);
        if (i === undefined) continue;
        entrees["Cours de vacances"][i] += Number(p.montant_paye || 0);
        addMode(p.mode, Number(p.montant_paye || 0));
      }


      // ── Sorties : dépenses par catégorie ──
      const { data: depenses } = await supabase
        .from("depenses")
        .select("montant, categorie, date_depense, statut, cycle_id")
        .eq("ecole_id", ecoleId!)
        .gte("date_depense", from)
        .lte("date_depense", to);

      const sortiesMap = new Map<string, number[]>();
      for (const d of (depenses ?? []) as any[]) {
        if (!matchesCycle(d.cycle_id)) continue;
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

      const totalEntreesP = slice(mkLigne("TOTAL ENTRÉES", te));
      const totalSortiesP = slice(mkLigne("TOTAL SORTIES", ts));
      const soldeP = slice(mkLigne("SOLDE DE CAISSE", so));
      const cumulP = soldeCumuleFull.slice(f, l + 1).map((v) => Math.round(v));
      const ouverture = Math.round(f > 0 ? soldeCumuleFull[f - 1] : 0);

      return {
        mois: mois.slice(f, l + 1),
        moisExercice: mois,
        trimestres,
        entrees: lignesEntrees.map(slice),
        sorties: lignesSorties.map(slice).filter((r) => r.total !== 0),
        totalEntrees: totalEntreesP,
        totalSorties: totalSortiesP,
        solde: soldeP,
        soldeCumule: cumulP,
        soldeCumuleLigne: {
          libelle: "SOLDE CUMULÉ",
          valeurs: cumulP,
          total: cumulP[cumulP.length - 1] ?? 0,
        },
        bilan: {
          entrees: totalEntreesP.total,
          sorties: totalSortiesP.total,
          net: soldeP.total,
          ouverture,
          cloture: ouverture + soldeP.total,
        },
        remises: { total: Math.round(remisesTotal), nbEleves: remisesEleves.size },
        modes: [...modesMap.entries()]
          .map(([label, v]) => ({ label, count: v.count, total: Math.round(v.total) }))
          .sort((a, b) => b.total - a.total),
      };


    },
  });
}
