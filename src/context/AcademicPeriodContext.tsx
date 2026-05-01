import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type PeriodeStatut = "a_venir" | "en_cours" | "verrouillee";
export type AnneeStatut = "active" | "preparation" | "verrouillee" | "archivee";
export type Decoupage = "trimestre" | "semestre";

/** Modules dont l'édition peut être verrouillée par une période/année. */
export type LockableModule =
  | "notes"
  | "presences"
  | "paiements"
  | "inscriptions"
  | "discipline";

export const LOCKABLE_MODULES: { key: LockableModule; label: string }[] = [
  { key: "notes", label: "Notes & bulletins" },
  { key: "presences", label: "Présences" },
  { key: "paiements", label: "Paiements" },
  { key: "inscriptions", label: "Inscriptions" },
  { key: "discipline", label: "Discipline" },
];

export interface Periode {
  id: string;
  nom: string;
  debut: string; // ISO yyyy-mm-dd
  fin: string;
  statut: PeriodeStatut;
}

export interface AnneeScolaire {
  id: string;
  libelle: string;
  debut: string;
  fin: string;
  decoupage: Decoupage;
  statut: AnneeStatut;
  periodes: Periode[];
}

export interface LockState {
  locked: boolean;
  reason?: string;
  annee: AnneeScolaire;
  periode?: Periode;
}

interface Ctx {
  annees: AnneeScolaire[];
  activeAnneeId: string;
  setActiveAnneeId: (id: string) => void;
  activeAnnee: AnneeScolaire;
  /** Modules concernés par le verrouillage de période. */
  lockedModules: LockableModule[];
  setLockedModules: (m: LockableModule[]) => void;
  /** Mutations */
  upsertAnnee: (a: AnneeScolaire) => void;
  setAnneeStatut: (id: string, statut: AnneeStatut) => void;
  setPeriodeStatut: (anneeId: string, periodeId: string, statut: PeriodeStatut) => void;
  /** Logique de verrouillage central — date optionnelle (défaut = aujourd'hui). */
  getLockState: (module: LockableModule, dateIso?: string) => LockState;
  isLocked: (module: LockableModule, dateIso?: string) => boolean;
}

const STORAGE_ANNEES = "lovable.academic.annees.v1";
const STORAGE_ACTIVE = "lovable.academic.active.v1";
const STORAGE_MODULES = "lovable.academic.lockedModules.v1";

export function genererPeriodes(debutIso: string, finIso: string, decoupage: Decoupage): Periode[] {
  const debut = new Date(debutIso);
  const fin = new Date(finIso);
  const totalMs = fin.getTime() - debut.getTime();
  const n = decoupage === "trimestre" ? 3 : 2;
  const noms =
    decoupage === "trimestre"
      ? ["1er Trimestre", "2ème Trimestre", "3ème Trimestre"]
      : ["1er Semestre", "2ème Semestre"];
  const out: Periode[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(debut.getTime() + (totalMs * i) / n);
    const f = new Date(debut.getTime() + (totalMs * (i + 1)) / n - 24 * 3600 * 1000);
    out.push({
      id: `${debutIso}-p${i + 1}`,
      nom: noms[i],
      debut: d.toISOString().slice(0, 10),
      fin: f.toISOString().slice(0, 10),
      statut: "a_venir",
    });
  }
  return out;
}

const seed: AnneeScolaire[] = [
  {
    id: "2025-2026",
    libelle: "2025 - 2026",
    debut: "2025-09-01",
    fin: "2026-07-31",
    decoupage: "trimestre",
    statut: "active",
    periodes: [
      { id: "p1", nom: "1er Trimestre", debut: "2025-09-02", fin: "2025-12-20", statut: "verrouillee" },
      { id: "p2", nom: "2ème Trimestre", debut: "2026-01-06", fin: "2026-04-04", statut: "en_cours" },
      { id: "p3", nom: "3ème Trimestre", debut: "2026-04-21", fin: "2026-06-30", statut: "a_venir" },
    ],
  },
  {
    id: "2024-2025",
    libelle: "2024 - 2025",
    debut: "2024-09-02",
    fin: "2025-07-04",
    decoupage: "trimestre",
    statut: "archivee",
    periodes: [
      { id: "p1", nom: "1er Trimestre", debut: "2024-09-02", fin: "2024-12-20", statut: "verrouillee" },
      { id: "p2", nom: "2ème Trimestre", debut: "2025-01-06", fin: "2025-04-04", statut: "verrouillee" },
      { id: "p3", nom: "3ème Trimestre", debut: "2025-04-21", fin: "2025-07-04", statut: "verrouillee" },
    ],
  },
];

const C = createContext<Ctx | null>(null);

function loadAnnees(): AnneeScolaire[] {
  try {
    const raw = localStorage.getItem(STORAGE_ANNEES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
}
function loadModules(): LockableModule[] {
  try {
    const raw = localStorage.getItem(STORAGE_MODULES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ["notes", "presences", "paiements", "inscriptions", "discipline"];
}

export function AcademicPeriodProvider({ children }: { children: ReactNode }) {
  const [annees, setAnnees] = useState<AnneeScolaire[]>(() => loadAnnees());
  const [activeAnneeId, setActiveAnneeIdState] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_ACTIVE) ??
      annees.find((a) => a.statut === "active")?.id ??
      annees[0]?.id ??
      ""
    );
  });
  const [lockedModules, setLockedModulesState] = useState<LockableModule[]>(() => loadModules());

  useEffect(() => {
    localStorage.setItem(STORAGE_ANNEES, JSON.stringify(annees));
  }, [annees]);
  useEffect(() => {
    if (activeAnneeId) localStorage.setItem(STORAGE_ACTIVE, activeAnneeId);
  }, [activeAnneeId]);
  useEffect(() => {
    localStorage.setItem(STORAGE_MODULES, JSON.stringify(lockedModules));
  }, [lockedModules]);

  const activeAnnee = useMemo(
    () => annees.find((a) => a.id === activeAnneeId) ?? annees[0],
    [annees, activeAnneeId]
  );

  const setActiveAnneeId = (id: string) => setActiveAnneeIdState(id);
  const setLockedModules = (m: LockableModule[]) => setLockedModulesState(m);

  const upsertAnnee: Ctx["upsertAnnee"] = (a) =>
    setAnnees((s) => {
      const idx = s.findIndex((x) => x.id === a.id);
      if (idx === -1) return [a, ...s];
      const copy = [...s];
      copy[idx] = a;
      return copy;
    });

  const setAnneeStatut: Ctx["setAnneeStatut"] = (id, statut) =>
    setAnnees((s) =>
      s.map((a) => {
        if (a.id !== id) {
          // si on passe une autre année à "active", désactive l'ancienne active
          if (statut === "active" && a.statut === "active") {
            return { ...a, statut: "verrouillee" as AnneeStatut };
          }
          return a;
        }
        if (statut === "verrouillee" || statut === "archivee") {
          return {
            ...a,
            statut,
            periodes: a.periodes.map((p) => ({ ...p, statut: "verrouillee" as PeriodeStatut })),
          };
        }
        return { ...a, statut };
      })
    );

  const setPeriodeStatut: Ctx["setPeriodeStatut"] = (anneeId, periodeId, statut) =>
    setAnnees((s) =>
      s.map((a) =>
        a.id === anneeId
          ? { ...a, periodes: a.periodes.map((p) => (p.id === periodeId ? { ...p, statut } : p)) }
          : a
      )
    );

  /** Trouve la période contenant la date donnée. Si aucune → période la plus proche dans le passé. */
  const findPeriode = (a: AnneeScolaire, dateIso: string): Periode | undefined => {
    const inside = a.periodes.find((p) => dateIso >= p.debut && dateIso <= p.fin);
    if (inside) return inside;
    // Date hors de toute période (vacances) — on prend la dernière dont la fin <= date
    const past = a.periodes.filter((p) => p.fin < dateIso).sort((x, y) => (x.fin > y.fin ? -1 : 1));
    return past[0];
  };

  const getLockState: Ctx["getLockState"] = (module, dateIso) => {
    const date = (dateIso ?? new Date().toISOString().slice(0, 10));
    const a = activeAnnee;
    if (!a) return { locked: false, annee: a };
    if (a.statut === "archivee") {
      return {
        locked: true,
        annee: a,
        reason: `L'année ${a.libelle} est archivée (lecture seule).`,
      };
    }
    if (a.statut === "verrouillee") {
      return {
        locked: true,
        annee: a,
        reason: `L'année ${a.libelle} est verrouillée.`,
      };
    }
    // module non concerné par le verrouillage de période
    if (!lockedModules.includes(module)) return { locked: false, annee: a };

    const periode = findPeriode(a, date);
    if (periode && periode.statut === "verrouillee") {
      return {
        locked: true,
        annee: a,
        periode,
        reason: `${periode.nom} (${a.libelle}) est verrouillé(e). Modification impossible.`,
      };
    }
    return { locked: false, annee: a, periode };
  };

  const isLocked: Ctx["isLocked"] = (module, dateIso) => getLockState(module, dateIso).locked;

  const value: Ctx = {
    annees,
    activeAnneeId,
    setActiveAnneeId,
    activeAnnee,
    lockedModules,
    setLockedModules,
    upsertAnnee,
    setAnneeStatut,
    setPeriodeStatut,
    getLockState,
    isLocked,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAcademicPeriod() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useAcademicPeriod must be used within AcademicPeriodProvider");
  return ctx;
}

/** Hook pratique pour un écran qui édite un module donné. */
export function useLock(module: LockableModule, dateIso?: string) {
  const { getLockState } = useAcademicPeriod();
  return getLockState(module, dateIso);
}
