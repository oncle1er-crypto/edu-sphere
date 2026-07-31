import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";

/**
 * Découpage de l'établissement en 2 niveaux :
 *  - "primaire"   : cycles Maternelle + Primaire
 *  - "secondaire" : cycles Collège / Lycée / Secondaire
 *  - "all"        : globalisation (aucun filtre)
 *
 * Le niveau sélectionné est mémorisé dans localStorage et s'applique à tous
 * les modules SAUF Communication et Paramètres.
 */
export type Niveau = "all" | "primaire" | "secondaire";

export interface CycleLite {
  id: string;
  nom: string;
  ordre: number;
}

export const NIVEAU_LABELS: Record<Niveau, string> = {
  all: "Tous les niveaux",
  primaire: "Primaire",
  secondaire: "Secondaire",
};

/** Regroupe un cycle dans l'un des 2 niveaux, d'après son nom (fallback : ordre). */
export function niveauOfCycle(c: { nom?: string | null; ordre?: number | null }): Exclude<Niveau, "all"> {
  const n = (c.nom ?? "").toLowerCase();
  if (n.includes("matern") || n.includes("prescol") || n.includes("primaire") || n.includes("prim"))
    return "primaire";
  if (n.includes("second") || n.includes("coll") || n.includes("lyc")) return "secondaire";
  return (c.ordre ?? 0) >= 2 ? "secondaire" : "primaire";
}

interface NiveauContextValue {
  /** Niveau actif ("all" = globalisé). */
  niveau: Niveau;
  setNiveau: (n: Niveau) => void;
  /** true quand aucun filtre de niveau ne s'applique. */
  isGlobal: boolean;
  /** true quand le niveau est imposé par le profil utilisateur (non modifiable). */
  forced: boolean;
  label: string;
  loading: boolean;
  /** Tous les cycles de l'école. */
  cycles: CycleLite[];
  /** Ids des cycles du niveau actif (vide si global). */
  cycleIds: string[];
  /** Ids des classes du niveau actif pour l'année active (null si global). */
  classeIds: string[] | null;
  /** Ids des élèves du niveau actif pour l'année active (null si global). */
  eleveIds: string[] | null;
  /** Ids des cycles d'un niveau donné (utile pour les calculs comparatifs). */
  cycleIdsOf: (n: Niveau) => string[];
  /** Effectif élèves par niveau (année active) — sert de clé de répartition. */
  effectifs: { primaire: number; secondaire: number; total: number };
  /**
   * Filtre un tableau d'objets sur le niveau actif via une colonne `cycle_id`.
   * Les lignes sans cycle_id (= "Commun") sont conservées.
   */
  keepByCycle: <T extends { cycle_id?: string | null }>(rows: T[]) => T[];
  /** true si la ligne appartient au niveau actif ou est commune. */
  matchesCycle: (cycleId: string | null | undefined) => boolean;
  refresh: () => void;
}

const Ctx = createContext<NiveauContextValue | null>(null);
const KEY = "gsp.niveau.current";

const isNiveau = (v: unknown): v is Niveau =>
  v === "all" || v === "primaire" || v === "secondaire";

export function NiveauProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const anneeId = activeAnnee?.id ?? null;

  const [cycles, setCycles] = useState<CycleLite[]>([]);
  const [profileCycleId, setProfileCycleId] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; cycle_id: string | null }[]>([]);
  const [eleves, setEleves] = useState<{ id: string; classe_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [stored, setStored] = useState<Niveau>(() => {
    const v = localStorage.getItem(KEY);
    return isNiveau(v) ? v : "all";
  });

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Cycles + restriction éventuelle du profil
  useEffect(() => {
    if (ecoleLoading) return;
    if (!ecoleId) {
      setCycles([]);
      setProfileCycleId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [cyRes, prRes] = await Promise.all([
        supabase.from("cycles").select("id, nom, ordre").eq("ecole_id", ecoleId).order("ordre"),
        user
          ? supabase.from("profiles").select("cycle_id").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      setCycles(((cyRes.data ?? []) as any[]).map((c) => ({ id: c.id, nom: c.nom, ordre: c.ordre ?? 0 })));
      setProfileCycleId(((prRes as any)?.data?.cycle_id as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [ecoleId, ecoleLoading, user?.id, tick]);

  // Classes + élèves de l'année active (pour dériver les filtres)
  useEffect(() => {
    if (ecoleLoading || periodLoading) return;
    if (!ecoleId) { setClasses([]); setEleves([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let clQ = supabase.from("classes").select("id, cycle_id").eq("ecole_id", ecoleId);
      if (anneeId) clQ = clQ.eq("annee_id", anneeId);
      let elQ = supabase.from("eleves").select("id, classe_id").eq("ecole_id", ecoleId).range(0, 4999);
      if (anneeId) elQ = elQ.eq("annee_id", anneeId);
      const [clRes, elRes] = await Promise.all([clQ, elQ]);
      if (cancelled) return;
      setClasses((clRes.data ?? []) as any[]);
      setEleves((elRes.data ?? []) as any[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ecoleId, ecoleLoading, periodLoading, anneeId, tick]);

  const cycleIdsOf = useCallback(
    (n: Niveau) => (n === "all" ? [] : cycles.filter((c) => niveauOfCycle(c) === n).map((c) => c.id)),
    [cycles],
  );

  // Niveau imposé par le profil ?
  const forcedNiveau: Niveau | null = useMemo(() => {
    if (!profileCycleId) return null;
    const c = cycles.find((x) => x.id === profileCycleId);
    return c ? niveauOfCycle(c) : null;
  }, [profileCycleId, cycles]);

  const niveau: Niveau = forcedNiveau ?? stored;
  const isGlobal = niveau === "all";

  const setNiveau = useCallback(
    (n: Niveau) => {
      if (forcedNiveau) return;
      setStored(n);
      localStorage.setItem(KEY, n);
    },
    [forcedNiveau],
  );

  const cycleIds = useMemo(() => cycleIdsOf(niveau), [cycleIdsOf, niveau]);

  const classeIds = useMemo(() => {
    if (isGlobal) return null;
    const set = new Set(cycleIds);
    return classes.filter((c) => c.cycle_id && set.has(c.cycle_id)).map((c) => c.id);
  }, [isGlobal, cycleIds, classes]);

  const eleveIds = useMemo(() => {
    if (isGlobal || !classeIds) return null;
    const set = new Set(classeIds);
    return eleves.filter((e) => e.classe_id && set.has(e.classe_id)).map((e) => e.id);
  }, [isGlobal, classeIds, eleves]);

  const effectifs = useMemo(() => {
    const cycleNiveau = new Map(cycles.map((c) => [c.id, niveauOfCycle(c)]));
    const classeNiveau = new Map(
      classes.map((c) => [c.id, c.cycle_id ? cycleNiveau.get(c.cycle_id) ?? null : null]),
    );
    let primaire = 0;
    let secondaire = 0;
    for (const e of eleves) {
      const n = e.classe_id ? classeNiveau.get(e.classe_id) : null;
      if (n === "primaire") primaire += 1;
      else if (n === "secondaire") secondaire += 1;
    }
    return { primaire, secondaire, total: primaire + secondaire };
  }, [cycles, classes, eleves]);

  const matchesCycle = useCallback(
    (cycleId: string | null | undefined) => {
      if (isGlobal) return true;
      if (!cycleId) return true; // Commun : visible dans tous les niveaux
      return cycleIds.includes(cycleId);
    },
    [isGlobal, cycleIds],
  );

  const keepByCycle = useCallback(
    <T extends { cycle_id?: string | null }>(rows: T[]) =>
      isGlobal ? rows : rows.filter((r) => matchesCycle(r.cycle_id)),
    [isGlobal, matchesCycle],
  );

  const value: NiveauContextValue = {
    niveau,
    setNiveau,
    isGlobal,
    forced: !!forcedNiveau,
    label: NIVEAU_LABELS[niveau],
    loading: loading || ecoleLoading || periodLoading,
    cycles,
    cycleIds,
    classeIds,
    eleveIds,
    cycleIdsOf,
    effectifs,
    keepByCycle,
    matchesCycle,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNiveau() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNiveau must be used within NiveauProvider");
  return ctx;
}

/**
 * Version tolérante : renvoie un état "global" si le provider est absent
 * (utile pour les écrans hors périmètre : Communication, Paramètres, auth…).
 */
export function useNiveauOptional() {
  return useContext(Ctx);
}

/** Découpe une liste d'ids en lots pour les filtres `.in()` PostgREST. */
export function chunkIds(ids: string[], size = 500): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
