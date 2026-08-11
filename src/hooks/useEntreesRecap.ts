import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useFinanceSettings } from "@/hooks/useFinanceSettings";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { ventilerScolarite, type VentilationParams } from "@/lib/ventilationScolarite";
import { modeMeta } from "@/pages/finances/scolarite-data";
import { plageFinanciereAnnee } from "@/lib/academicRange";
import {
  type DateBucket,
  buildJourBuckets,
  buildSemaineBuckets,
  buildMoisBuckets,
  buildTrimestreBuckets,
  clipBuckets,
} from "@/lib/dateBuckets";

/**
 * Récapitulatif des entrées (recettes), toutes catégories confondues,
 * découpé selon une granularité choisie par l'utilisateur (jour / semaine /
 * mois / trimestre) ou globalisé en une seule ligne — filtré par niveau.
 *
 * Indépendant de `useBilanComptable.ts` (aucune modification de ce fichier) :
 * même schéma de données, mêmes règles de ventilation de la scolarité (via
 * `ventilerScolarite`, déjà mutualisé), mais bucketing générique par jour
 * plutôt que par mois fixe, pour ne prendre aucun risque de régression sur
 * le Bilan Comptable existant.
 *
 * IMPORTANT (exactitude) : la ventilation scolarité doit rester calculée sur
 * l'historique COMPLET des versements de l'exercice (chronologique, par
 * élève), même si l'utilisateur restreint l'affichage à une sous-période.
 * Ne jamais filtrer la requête `paiements` sur la période affichée : cela
 * fausserait le cumul et donc l'affectation inscription/scolarité/annexes.
 * (Même principe que useBilanComptable.ts, qui calcule sur l'exercice entier
 * puis ne « tranche » qu'à l'affichage.)
 */

export const ENTREES_LIBELLES = [
  "Frais de scolarité",
  "Frais d'inscription et de réinscription",
  "Frais de cantine",
  "Frais de transport scolaire",
  "Frais d'uniformes ou de fournitures",
  "Les activités extrascolaires",
  "Cours de vacances",
  "Autres services ponctuels",
] as const;

export type EntreeKey = (typeof ENTREES_LIBELLES)[number];

export type Granularite = "global" | "jour" | "semaine" | "mois" | "trimestre";

export type RecapPeriode =
  | { mode: "annee" }
  | { mode: "trimestre"; index: number }
  | { mode: "mois"; index: number };

export interface RecapLigne {
  libelle: string;
  /** Alignées sur `buckets` */
  valeurs: number[];
  total: number;
}

export interface RecapModeLigne {
  label: string;
  count: number;
  total: number;
}

export interface EntreesRecap {
  buckets: DateBucket[];
  lignes: RecapLigne[];
  totalLigne: RecapLigne;
  modes: RecapModeLigne[];
  remises: { total: number; nbEleves: number };
  /** Libellé de la période affichée, pour l'en-tête d'impression */
  periodeLabel: string;
  /** Tous les mois / trimestres de l'exercice (avant restriction de période), pour peupler les sélecteurs */
  moisExercice: DateBucket[];
  trimestresExercice: DateBucket[];
}

const dayKey = (date?: string | null) => (date ? String(date).slice(0, 10) : null);

const addTo = (map: Map<string, number>, key: string, montant: number) => {
  map.set(key, (map.get(key) ?? 0) + montant);
};

export function useEntreesRecap(granularite: Granularite, periode: RecapPeriode = { mode: "annee" }) {
  const { ecoleId } = useEcoleId();
  const { activeAnnee } = useAcademicPeriod();
  const { settings } = useFinanceSettings();
  const { niveau, isGlobal, keepEleve, keepClasse, matchesCycle } = useNiveauFilters();

  const params: VentilationParams = {
    fraisInscription: Number(settings.frais_inscription) || 0,
    fraisUniformes: Number(settings.frais_uniformes) || 0,
    fraisActivites: Number(settings.frais_activites) || 0,
  };

  return useQuery<EntreesRecap>({
    queryKey: ["entrees_recap", ecoleId, activeAnnee?.id, params, granularite, periode, niveau],
    enabled: !!ecoleId && !!activeAnnee,
    queryFn: async () => {
      const plage = plageFinanciereAnnee(activeAnnee)!;
      const { from, to } = plage;

      // ── Découpage mensuel/trimestriel de l'exercice complet (pour les
      // granularités "mois"/"trimestre" et pour borner la période choisie) ──
      const moisExercice = buildMoisBuckets(from, to);
      const trimestresExercice = buildTrimestreBuckets(moisExercice);

      // ── Bornes de la période affichée (identique à useBilanComptable) ──
      let dFrom = from;
      let dTo = to;
      let periodeLabel = "Exercice complet";
      if (periode.mode === "trimestre") {
        const t = trimestresExercice[Math.min(Math.max(0, periode.index), trimestresExercice.length - 1)];
        if (t) { dFrom = t.from; dTo = t.to; periodeLabel = t.label; }
      } else if (periode.mode === "mois") {
        const m = moisExercice[Math.min(Math.max(0, periode.index), moisExercice.length - 1)];
        if (m) { dFrom = m.from; dTo = m.to; periodeLabel = m.label; }
      }

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

      // ── Cartes "par jour" pour chaque catégorie d'entrée ──
      const entreesParJour: Record<EntreeKey, Map<string, number>> = Object.fromEntries(
        ENTREES_LIBELLES.map((l) => [l, new Map<string, number>()]),
      ) as Record<EntreeKey, Map<string, number>>;

      const modesParJour = new Map<string, { count: Map<string, number>; total: Map<string, number> }>();
      const addMode = (mode: string | null | undefined, montant: number, jour: string) => {
        const meta = modeMeta(String(mode ?? ""));
        if (meta.kind !== "encaissement") return;
        const cur = modesParJour.get(meta.label) ?? { count: new Map(), total: new Map() };
        addTo(cur.count, jour, 1);
        addTo(cur.total, jour, montant);
        modesParJour.set(meta.label, cur);
      };

      const remisesParJour = new Map<string, number>();
      const remisesElevesParJour = new Map<string, Set<string>>();

      // ── Encaissements scolarité + factures de services (exercice complet) ──
      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant, mode, date_paiement, eleve_id, tranche_id, facture_id, factures(categorie)")
        .eq("ecole_id", ecoleId!)
        .is("annule_le", null)
        .gte("date_paiement", from)
        .lte("date_paiement", to)
        .order("date_paiement", { ascending: true });

      const parEleve = new Map<string, any[]>();
      for (const p of (paiements ?? []) as any[]) {
        if (!keepEleve(p.eleve_id)) continue;
        const j = dayKey(p.date_paiement);
        if (!j) continue;
        const isRemise = modeMeta(String(p.mode ?? "")).kind === "remise";
        if (isRemise) {
          addTo(remisesParJour, j, Number(p.montant || 0));
          if (p.eleve_id) {
            const set = remisesElevesParJour.get(j) ?? new Set<string>();
            set.add(p.eleve_id);
            remisesElevesParJour.set(j, set);
          }
        } else {
          addMode(p.mode, Number(p.montant || 0), j);
        }

        if (p.tranche_id && trancheIds.has(p.tranche_id)) {
          const list = parEleve.get(p.eleve_id) ?? [];
          list.push(p);
          parEleve.set(p.eleve_id, list);
          continue;
        }
        if (isRemise) continue;
        const cat = p.factures?.categorie;
        if (cat === "cantine") addTo(entreesParJour["Frais de cantine"], j, Number(p.montant || 0));
        else if (cat === "transport") addTo(entreesParJour["Frais de transport scolaire"], j, Number(p.montant || 0));
      }

      for (const [eleveId, list] of parEleve) {
        const totalDu = totalDuParEleve.get(eleveId) ?? list.reduce((s, p) => s + Number(p.montant || 0), 0);
        let cumul = 0;
        for (const p of list) {
          const j = dayKey(p.date_paiement)!;
          const m = Number(p.montant || 0);
          const isRemise = modeMeta(String(p.mode ?? "")).kind === "remise";
          const avant = ventilerScolarite(totalDu, cumul, params);
          const apres = ventilerScolarite(totalDu, cumul + m, params);
          cumul += m;
          if (isRemise) continue;

          const diff = (cle: string) =>
            (apres.postes.find((x) => x.cle === cle)?.affecte ?? 0) -
            (avant.postes.find((x) => x.cle === cle)?.affecte ?? 0);
          const diffAnnexe = (n: number) =>
            (apres.detailAnnexes[n]?.affecte ?? 0) - (avant.detailAnnexes[n]?.affecte ?? 0);

          addTo(entreesParJour["Frais d'inscription et de réinscription"], j, diff("inscription"));
          addTo(entreesParJour["Frais de scolarité"], j, diff("scolarite"));
          addTo(entreesParJour["Frais d'uniformes ou de fournitures"], j, diffAnnexe(0));
          addTo(entreesParJour["Les activités extrascolaires"], j, diffAnnexe(1));

          const ventile = diff("inscription") + diff("scolarite") + diff("annexes");
          if (m - ventile > 0.5) addTo(entreesParJour["Frais de scolarité"], j, m - ventile);
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
        const j = dayKey(p.created_at);
        if (!j) continue;
        const key: EntreeKey = p.service_type === "transport" ? "Frais de transport scolaire" : "Frais de cantine";
        addTo(entreesParJour[key], j, Number(p.montant || 0));
        addMode(p.mode, Number(p.montant || 0), j);
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
          const ok = p.eleve_id ? keepEleve(p.eleve_id) : keepClasse(p.sp_candidats?.classe_demandee_id);
          if (!ok) continue;
        }
        const j = dayKey(p.date_paiement);
        if (!j) continue;
        const s = slugById.get(p.service_id) ?? "";
        const key: EntreeKey = /tenue|uniforme|fourniture/.test(s)
          ? "Frais d'uniformes ou de fournitures"
          : "Autres services ponctuels";
        addTo(entreesParJour[key], j, Number(p.montant_paye || 0));
        addMode(p.mode_paiement, Number(p.montant_paye || 0), j);
      }

      // ── Ventes de tenues scolaires (module dédié, hors sp_paiements) ──
      // Cf. useBilanComptable.ts pour le détail : sp_ventes_tenues est une
      // table autonome jamais couverte par le bloc "Services ponctuels"
      // ci-dessus, corrigé le 11/08/2026 (147 000 FCFA de ventes réelles
      // manquantes). "attente"/"annule" exclus (pas d'encaissement réel) ;
      // created_at fait foi comme date d'encaissement dans tous les autres cas.
      const { data: ventesTenues } = await supabase
        .from("sp_ventes_tenues")
        .select("montant_total, mode_paiement, created_at, eleve_id, classe_id, statut")
        .eq("ecole_id", ecoleId!)
        .neq("statut", "annule")
        .neq("statut", "attente")
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`);
      for (const v of (ventesTenues ?? []) as any[]) {
        if (!isGlobal) {
          const ok = v.eleve_id ? keepEleve(v.eleve_id) : keepClasse(v.classe_id);
          if (!ok) continue;
        }
        const j = dayKey(v.created_at);
        if (!j) continue;
        addTo(entreesParJour["Frais d'uniformes ou de fournitures"], j, Number(v.montant_total || 0));
        addMode(v.mode_paiement, Number(v.montant_total || 0), j);
      }

      // ── Cours de vacances (filtrage par cycle_id, cf. useBilanComptable.ts) ──
      const { data: vac } = await supabase
        .from("vacances_paiements")
        .select("montant_paye, mode, date_paiement, eleve_id, vacances_classes(cycle_id)")
        .eq("ecole_id", ecoleId!)
        .gte("date_paiement", from)
        .lte("date_paiement", to);
      for (const p of (vac ?? []) as any[]) {
        if (!matchesCycle(p.vacances_classes?.cycle_id)) continue;
        const j = dayKey(p.date_paiement);
        if (!j) continue;
        addTo(entreesParJour["Cours de vacances"], j, Number(p.montant_paye || 0));
        addMode(p.mode, Number(p.montant_paye || 0), j);
      }

      // ── Construction des buckets d'affichage selon la granularité ──
      let buckets: DateBucket[];
      if (granularite === "global") {
        buckets = [{ key: "global", label: periodeLabel, from: dFrom, to: dTo }];
      } else if (granularite === "jour") {
        buckets = buildJourBuckets(dFrom, dTo);
      } else if (granularite === "semaine") {
        buckets = buildSemaineBuckets(dFrom, dTo);
      } else if (granularite === "mois") {
        buckets = clipBuckets(moisExercice, dFrom, dTo);
      } else {
        buckets = clipBuckets(trimestresExercice, dFrom, dTo);
      }

      const sommeSur = (map: Map<string, number>, b: DateBucket) => {
        let s = 0;
        for (const [j, v] of map) if (j >= b.from && j <= b.to) s += v;
        return s;
      };

      const mkLigne = (libelle: string, map: Map<string, number>): RecapLigne => {
        const valeurs = buckets.map((b) => Math.round(sommeSur(map, b)));
        return { libelle, valeurs, total: valeurs.reduce((s, v) => s + v, 0) };
      };

      const lignes = ENTREES_LIBELLES.map((l) => mkLigne(l, entreesParJour[l])).filter(
        (l) => l.total !== 0 || ENTREES_LIBELLES.indexOf(l.libelle as EntreeKey) < 6,
      );

      const totalValeurs = buckets.map((_, i) => lignes.reduce((s, l) => s + l.valeurs[i], 0));
      const totalLigne: RecapLigne = {
        libelle: "TOTAL ENTRÉES",
        valeurs: totalValeurs,
        total: totalValeurs.reduce((s, v) => s + v, 0),
      };

      const modes: RecapModeLigne[] = [...modesParJour.entries()]
        .map(([label, v]) => {
          let count = 0;
          let total = 0;
          for (const [j, c] of v.count) if (j >= dFrom && j <= dTo) count += c;
          for (const [j, t] of v.total) if (j >= dFrom && j <= dTo) total += t;
          return { label, count, total: Math.round(total) };
        })
        .filter((m) => m.count > 0)
        .sort((a, b) => b.total - a.total);

      let remisesTotal = 0;
      const remisesEleves = new Set<string>();
      for (const [j, v] of remisesParJour) if (j >= dFrom && j <= dTo) remisesTotal += v;
      for (const [j, set] of remisesElevesParJour) if (j >= dFrom && j <= dTo) for (const e of set) remisesEleves.add(e);

      return {
        buckets,
        lignes,
        totalLigne,
        modes,
        remises: { total: Math.round(remisesTotal), nbEleves: remisesEleves.size },
        periodeLabel,
        moisExercice,
        trimestresExercice,
      };
    },
  });
}
