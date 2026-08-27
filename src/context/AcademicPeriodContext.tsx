import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoles } from "@/context/EcoleContext";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

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
  debut: string;
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
  loading: boolean;
  lockedModules: LockableModule[];
  setLockedModules: (m: LockableModule[]) => void;
  upsertAnnee: (a: AnneeScolaire) => void;
  setAnneeStatut: (id: string, statut: AnneeStatut) => void;
  setPeriodeStatut: (anneeId: string, periodeId: string, statut: PeriodeStatut) => void;
  generatePeriodesForAnnee: (anneeId: string) => Promise<void>;
  getLockState: (module: LockableModule, dateIso?: string) => LockState;
  isLocked: (module: LockableModule, dateIso?: string) => boolean;
}

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

/** Année de repli quand la base est vide / en cours de chargement. */
const EMPTY_ANNEE: AnneeScolaire = {
  id: "",
  libelle: "—",
  debut: new Date().toISOString().slice(0, 10),
  fin: new Date().toISOString().slice(0, 10),
  decoupage: "trimestre",
  statut: "preparation",
  periodes: [],
};

const C = createContext<Ctx | null>(null);

function loadModules(): LockableModule[] {
  try {
    const raw = localStorage.getItem(STORAGE_MODULES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("loadModules: lecture localStorage échouée, valeurs par défaut utilisées", e);
  }
  return ["notes", "presences", "paiements", "inscriptions", "discipline"];
}

export function AcademicPeriodProvider({ children }: { children: ReactNode }) {
  const { currentEcoleId } = useEcoles();
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAnneeId, setActiveAnneeIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_ACTIVE) ?? ""
  );
  const [lockedModules, setLockedModulesState] = useState<LockableModule[]>(() => loadModules());

  useEffect(() => {
    localStorage.setItem(STORAGE_MODULES, JSON.stringify(lockedModules));
  }, [lockedModules]);

  useEffect(() => {
    if (activeAnneeId) localStorage.setItem(STORAGE_ACTIVE, activeAnneeId);
  }, [activeAnneeId]);

  const fetchAll = useCallback(async () => {
    if (!currentEcoleId) {
      setAnnees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: aData, error: aErr } = await supabase
      .from("annees_scolaires")
      .select("id, libelle, debut, fin, decoupage, statut")
      .eq("ecole_id", currentEcoleId)
      .order("debut", { ascending: false });
    if (aErr) {
      console.error(aErr);
      setAnnees([]);
      setLoading(false);
      return;
    }
    const ids = (aData ?? []).map((a) => a.id);
    const periodesByAnnee: Record<string, Periode[]> = {};
    if (ids.length > 0) {
      const { data: pData, error: pErr } = await supabase
        .from("periodes")
        .select("id, annee_id, nom, debut, fin, statut")
        .in("annee_id", ids)
        .order("debut", { ascending: true });
      if (pErr) console.error(pErr);
      (pData ?? []).forEach((p: any) => {
        (periodesByAnnee[p.annee_id] ||= []).push({
          id: p.id,
          nom: p.nom,
          debut: p.debut,
          fin: p.fin,
          statut: p.statut as PeriodeStatut,
        });
      });
    }
    const list: AnneeScolaire[] = (aData ?? []).map((a: any) => ({
      id: a.id,
      libelle: a.libelle,
      debut: a.debut,
      fin: a.fin,
      decoupage: a.decoupage as Decoupage,
      statut: a.statut as AnneeStatut,
      periodes: periodesByAnnee[a.id] ?? [],
    }));
    setAnnees(list);
    setLoading(false);
  }, [currentEcoleId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Valide l'année active en fonction des données chargées.
  // - Si l'id stocké n'existe plus : bascule sur l'active DB.
  // - À la 1re hydratation, si l'id stocké pointe sur une année NON-active alors
  //   qu'une année active existe, on force la bascule (évite qu'un cache
  //   localStorage pointant sur une année verrouillée/archivée masque le
  //   module finances de l'année en cours). L'utilisateur peut ensuite
  //   sélectionner une autre année manuellement pour consulter l'historique.
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (loading || annees.length === 0) return;
    const stillValid = annees.some((a) => a.id === activeAnneeId);
    const dbActiveId = annees.find((a) => a.statut === "active")?.id ?? annees[0].id;
    if (!stillValid) {
      setActiveAnneeIdState(dbActiveId);
      initialSyncDone.current = true;
      return;
    }
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      const current = annees.find((a) => a.id === activeAnneeId);
      if (current && current.statut !== "active" && dbActiveId !== activeAnneeId) {
        setActiveAnneeIdState(dbActiveId);
      }
    }
  }, [loading, annees, activeAnneeId]);


  const activeAnnee = useMemo(
    () => annees.find((a) => a.id === activeAnneeId) ?? annees[0] ?? EMPTY_ANNEE,
    [annees, activeAnneeId]
  );

  const setActiveAnneeId = (id: string) => setActiveAnneeIdState(id);
  const setLockedModules = (m: LockableModule[]) => setLockedModulesState(m);

  const upsertAnnee: Ctx["upsertAnnee"] = async (a) => {
    if (!currentEcoleId) return;
    const existing = annees.find((x) => x.id === a.id);
    try {
      if (existing) {
        const { error } = await supabase
          .from("annees_scolaires")
          .update({
            libelle: a.libelle,
            debut: a.debut,
            fin: a.fin,
            decoupage: a.decoupage as any,
            statut: a.statut as any,
          })
          .eq("id", a.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("annees_scolaires").insert({
          ecole_id: currentEcoleId,
          libelle: a.libelle,
          debut: a.debut,
          fin: a.fin,
          decoupage: a.decoupage as any,
          statut: a.statut as any,
        }).select("id").single();
        if (error) throw error;
        // Insère aussi les périodes générées côté client (les IDs sont générés par la DB)
        if (inserted && a.periodes.length > 0) {
          const { error: pErr } = await supabase.from("periodes").insert(
            a.periodes.map((p) => ({
              ecole_id: currentEcoleId,
              annee_id: inserted.id,
              nom: p.nom,
              debut: p.debut,
              fin: p.fin,
              statut: p.statut as any,
            }))
          );
          if (pErr) throw pErr;
        }
      }
      await fetchAll();
    } catch (e: any) {
      toast.error(messageErreurBase(e) ?? "Erreur enregistrement année");
    }
  };

  const generatePeriodesForAnnee: Ctx["generatePeriodesForAnnee"] = async (anneeId) => {
    if (!currentEcoleId) return;
    const annee = annees.find((a) => a.id === anneeId);
    if (!annee) { toast.error("Année introuvable"); return; }
    if (annee.periodes.length > 0) { toast.error("Cette année a déjà des périodes"); return; }
    try {
      const periodes = genererPeriodes(annee.debut, annee.fin, annee.decoupage);
      const { error } = await supabase.from("periodes").insert(
        periodes.map((p) => ({
          ecole_id: currentEcoleId,
          annee_id: anneeId,
          nom: p.nom,
          debut: p.debut,
          fin: p.fin,
          statut: "a_venir" as any,
        }))
      );
      if (error) throw error;
      await fetchAll();
      toast.success(`${periodes.length} période(s) créée(s)`);
    } catch (e: any) {
      toast.error(messageErreurBase(e) ?? "Erreur génération périodes");
    }
  };

  const setAnneeStatut: Ctx["setAnneeStatut"] = async (id, statut) => {
    if (!currentEcoleId) return;
    try {
      if (statut === "active") {
        // Verrouille l'ancienne active (si différente)
        const oldActive = annees.find((a) => a.statut === "active" && a.id !== id);
        if (oldActive) {
          const { error } = await supabase
            .from("annees_scolaires")
            .update({ statut: "verrouillee" as any })
            .eq("id", oldActive.id);
          if (error) throw error;
        }
      }
      const { error } = await supabase
        .from("annees_scolaires")
        .update({ statut: statut as any })
        .eq("id", id);
      if (error) throw error;

      if (statut === "verrouillee" || statut === "archivee") {
        const target = annees.find((a) => a.id === id);
        if (target && target.periodes.length > 0) {
          const { error: pErr } = await supabase
            .from("periodes")
            .update({ statut: "verrouillee" as any })
            .in("id", target.periodes.map((p) => p.id));
          if (pErr) throw pErr;
        }
      }
      await fetchAll();
    } catch (e: any) {
      toast.error(messageErreurBase(e) ?? "Erreur mise à jour statut année");
    }
  };

  const setPeriodeStatut: Ctx["setPeriodeStatut"] = async (_anneeId, periodeId, statut) => {
    try {
      const { error } = await supabase
        .from("periodes")
        .update({ statut: statut as any })
        .eq("id", periodeId);
      if (error) throw error;
      await fetchAll();
    } catch (e: any) {
      toast.error(messageErreurBase(e) ?? "Erreur mise à jour statut période");
    }
  };

  const findPeriode = (a: AnneeScolaire, dateIso: string): Periode | undefined => {
    const inside = a.periodes.find((p) => dateIso >= p.debut && dateIso <= p.fin);
    if (inside) return inside;
    const past = a.periodes.filter((p) => p.fin < dateIso).sort((x, y) => (x.fin > y.fin ? -1 : 1));
    return past[0];
  };

  const getLockState: Ctx["getLockState"] = (module, dateIso) => {
    const date = dateIso ?? new Date().toISOString().slice(0, 10);
    const a = activeAnnee;
    if (!a || !a.id) return { locked: false, annee: a };
    if (a.statut === "archivee") {
      return { locked: true, annee: a, reason: `L'année ${a.libelle} est archivée (lecture seule).` };
    }
    if (a.statut === "verrouillee") {
      return { locked: true, annee: a, reason: `L'année ${a.libelle} est verrouillée.` };
    }
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
    activeAnneeId: activeAnnee.id,
    setActiveAnneeId,
    activeAnnee,
    loading,
    lockedModules,
    setLockedModules,
    upsertAnnee,
    setAnneeStatut,
    setPeriodeStatut,
    generatePeriodesForAnnee,
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

export function useLock(module: LockableModule, dateIso?: string) {
  const { getLockState } = useAcademicPeriod();
  return getLockState(module, dateIso);
}
