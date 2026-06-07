import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export type EcoleStatus = "active" | "suspendue" | "archivee";

export interface Ecole {
  ecole_id: string;
  nom: string;
  code: string;
  ville: string;
  pays: string;
  adresse: string;
  telephone: string;
  email: string;
  directeur: string;
  type: "Maternelle" | "Primaire" | "Collège" | "Lycée" | "Groupe scolaire";
  status: EcoleStatus;
  date_creation: string;
  effectif_eleves: number;
  effectif_enseignants: number;
  nb_classes: number;
  revenu_mensuel: number;
}

interface EcoleContextValue {
  ecoles: Ecole[];
  loading: boolean;
  currentEcoleId: string | null;
  currentEcole: Ecole | null;
  setCurrentEcoleId: (id: string) => void;
  createEcole: (data: Omit<Ecole, "ecole_id" | "date_creation" | "status" | "effectif_eleves" | "effectif_enseignants" | "nb_classes" | "revenu_mensuel">) => Promise<Ecole | null>;
  updateEcole: (id: string, patch: Partial<Ecole>) => Promise<void>;
  setStatus: (id: string, status: EcoleStatus) => Promise<void>;
  removeEcole: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<EcoleContextValue | null>(null);
const CURRENT_KEY = "lovable.ecoles.current";

function rowToEcole(row: any, counts?: { eleves: number; enseignants: number; classes: number }): Ecole {
  return {
    ecole_id: row.id,
    nom: row.nom,
    code: row.code,
    ville: row.ville ?? "",
    pays: row.pays ?? "Côte d'Ivoire",
    adresse: row.adresse ?? "",
    telephone: row.telephone ?? "",
    email: row.email ?? "",
    directeur: row.directeur ?? "",
    type: (row.type as Ecole["type"]) ?? "Groupe scolaire",
    status: (row.status as EcoleStatus) ?? "active",
    date_creation: row.created_at?.slice(0, 10) ?? "",
    effectif_eleves: counts?.eleves ?? 0,
    effectif_enseignants: counts?.enseignants ?? 0,
    nb_classes: counts?.classes ?? 0,
    revenu_mensuel: 0,
  };
}

export function EcoleProvider({ children }: { children: ReactNode }) {
  const { ecoleId: userEcoleId, loading: userLoading } = useEcoleId();
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEcoleId, setCurrentEcoleIdState] = useState<string | null>(() => localStorage.getItem(CURRENT_KEY));

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ecoles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setEcoles([]);
      setLoading(false);
      return;
    }
    // Counts en parallèle
    const ids = (data ?? []).map((e: any) => e.id);
    const [elevesRes, ensRes, clRes] = await Promise.all([
      supabase.from("eleves").select("ecole_id").in("ecole_id", ids),
      supabase.from("enseignants").select("ecole_id").in("ecole_id", ids),
      supabase.from("classes").select("ecole_id").in("ecole_id", ids),
    ]);
    const countBy = (rows: any[] | null) => {
      const acc: Record<string, number> = {};
      (rows ?? []).forEach((r) => { acc[r.ecole_id] = (acc[r.ecole_id] ?? 0) + 1; });
      return acc;
    };
    const eC = countBy(elevesRes.data as any);
    const enC = countBy(ensRes.data as any);
    const cC = countBy(clRes.data as any);

    setEcoles((data ?? []).map((row: any) => rowToEcole(row, {
      eleves: eC[row.id] ?? 0,
      enseignants: enC[row.id] ?? 0,
      classes: cC[row.id] ?? 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Initialise currentEcoleId : préférence localStorage, sinon ecoleId du profil utilisateur, sinon première école
  useEffect(() => {
    if (userLoading || loading) return;
    if (currentEcoleId && ecoles.some((e) => e.ecole_id === currentEcoleId)) return;
    const preferred = userEcoleId && ecoles.some((e) => e.ecole_id === userEcoleId)
      ? userEcoleId
      : ecoles[0]?.ecole_id ?? null;
    if (preferred) {
      setCurrentEcoleIdState(preferred);
      localStorage.setItem(CURRENT_KEY, preferred);
    }
  }, [userLoading, loading, userEcoleId, ecoles, currentEcoleId]);

  const setCurrentEcoleId = (id: string) => {
    setCurrentEcoleIdState(id);
    localStorage.setItem(CURRENT_KEY, id);
  };

  const createEcole: EcoleContextValue["createEcole"] = async (data) => {
    const { data: row, error } = await supabase
      .from("ecoles")
      .insert({
        nom: data.nom,
        code: data.code,
        ville: data.ville,
        pays: data.pays || "Côte d'Ivoire",
        adresse: data.adresse,
        telephone: data.telephone,
        email: data.email,
        directeur: data.directeur,
        type: data.type,
        status: "active" as any,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    const ecole = rowToEcole(row);
    setEcoles((prev) => [ecole, ...prev]);
    return ecole;
  };

  const updateEcole: EcoleContextValue["updateEcole"] = async (id, patch) => {
    const dbPatch: Record<string, any> = {};
    if (patch.nom !== undefined) dbPatch.nom = patch.nom;
    if (patch.code !== undefined) dbPatch.code = patch.code;
    if (patch.ville !== undefined) dbPatch.ville = patch.ville;
    if (patch.pays !== undefined) dbPatch.pays = patch.pays;
    if (patch.adresse !== undefined) dbPatch.adresse = patch.adresse;
    if (patch.telephone !== undefined) dbPatch.telephone = patch.telephone;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.directeur !== undefined) dbPatch.directeur = patch.directeur;
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    const { error } = await supabase.from("ecoles").update(dbPatch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEcoles((prev) => prev.map((e) => (e.ecole_id === id ? { ...e, ...patch } : e)));
  };

  const setStatus: EcoleContextValue["setStatus"] = async (id, status) => updateEcole(id, { status });

  const removeEcole: EcoleContextValue["removeEcole"] = async (id) => {
    const { error } = await supabase.from("ecoles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEcoles((prev) => prev.filter((e) => e.ecole_id !== id));
  };

  const currentEcole = useMemo(
    () => ecoles.find((e) => e.ecole_id === currentEcoleId) ?? null,
    [ecoles, currentEcoleId],
  );

  return (
    <Ctx.Provider value={{ ecoles, loading, currentEcoleId, currentEcole, setCurrentEcoleId, createEcole, updateEcole, setStatus, removeEcole, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEcoles() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEcoles must be used within EcoleProvider");
  return ctx;
}
