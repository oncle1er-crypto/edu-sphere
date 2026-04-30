import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

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
  // Statistiques (placeholder, alimentées par les autres modules en multi-tenant)
  effectif_eleves: number;
  effectif_enseignants: number;
  nb_classes: number;
  revenu_mensuel: number; // en FCFA
}

interface EcoleContextValue {
  ecoles: Ecole[];
  currentEcoleId: string | null;
  currentEcole: Ecole | null;
  setCurrentEcoleId: (id: string) => void;
  createEcole: (data: Omit<Ecole, "ecole_id" | "date_creation" | "status" | "effectif_eleves" | "effectif_enseignants" | "nb_classes" | "revenu_mensuel">) => Ecole;
  updateEcole: (id: string, patch: Partial<Ecole>) => void;
  setStatus: (id: string, status: EcoleStatus) => void;
  removeEcole: (id: string) => void;
}

const STORAGE_KEY = "lovable.ecoles.v1";
const CURRENT_KEY = "lovable.ecoles.current";

const seed: Ecole[] = [
  {
    ecole_id: "ec_001",
    nom: "Groupe Scolaire Les Lauriers",
    code: "GSL-001",
    ville: "Dakar",
    pays: "Sénégal",
    adresse: "Avenue Cheikh Anta Diop",
    telephone: "+221 33 822 00 00",
    email: "contact@lauriers.sn",
    directeur: "M. Diop",
    type: "Groupe scolaire",
    status: "active",
    date_creation: "2021-09-01",
    effectif_eleves: 842,
    effectif_enseignants: 62,
    nb_classes: 28,
    revenu_mensuel: 12_400_000,
  },
  {
    ecole_id: "ec_002",
    nom: "École Primaire Saint-Joseph",
    code: "EPSJ-002",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    adresse: "Rue des Jardins, Cocody",
    telephone: "+225 27 22 44 55 66",
    email: "info@stjoseph.ci",
    directeur: "Mme Koné",
    type: "Primaire",
    status: "active",
    date_creation: "2019-09-15",
    effectif_eleves: 412,
    effectif_enseignants: 24,
    nb_classes: 14,
    revenu_mensuel: 5_800_000,
  },
  {
    ecole_id: "ec_003",
    nom: "Lycée Moderne de Yaoundé",
    code: "LMY-003",
    ville: "Yaoundé",
    pays: "Cameroun",
    adresse: "Quartier Bastos",
    telephone: "+237 222 20 30 40",
    email: "direction@lmy.cm",
    directeur: "M. Mbarga",
    type: "Lycée",
    status: "suspendue",
    date_creation: "2018-09-01",
    effectif_eleves: 1_120,
    effectif_enseignants: 78,
    nb_classes: 32,
    revenu_mensuel: 0,
  },
];

const Ctx = createContext<EcoleContextValue | null>(null);

function load(): Ecole[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Ecole[];
  } catch {}
  return seed;
}

export function EcoleProvider({ children }: { children: ReactNode }) {
  const [ecoles, setEcoles] = useState<Ecole[]>(() => load());
  const [currentEcoleId, setCurrentEcoleIdState] = useState<string | null>(() => {
    const saved = localStorage.getItem(CURRENT_KEY);
    return saved ?? load()[0]?.ecole_id ?? null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ecoles));
  }, [ecoles]);

  useEffect(() => {
    if (currentEcoleId) localStorage.setItem(CURRENT_KEY, currentEcoleId);
  }, [currentEcoleId]);

  const setCurrentEcoleId = (id: string) => setCurrentEcoleIdState(id);

  const createEcole: EcoleContextValue["createEcole"] = (data) => {
    const ecole: Ecole = {
      ...data,
      ecole_id: `ec_${Date.now().toString(36)}`,
      date_creation: new Date().toISOString().slice(0, 10),
      status: "active",
      effectif_eleves: 0,
      effectif_enseignants: 0,
      nb_classes: 0,
      revenu_mensuel: 0,
    };
    setEcoles((prev) => [ecole, ...prev]);
    return ecole;
  };

  const updateEcole: EcoleContextValue["updateEcole"] = (id, patch) =>
    setEcoles((prev) => prev.map((e) => (e.ecole_id === id ? { ...e, ...patch } : e)));

  const setStatus: EcoleContextValue["setStatus"] = (id, status) =>
    updateEcole(id, { status });

  const removeEcole: EcoleContextValue["removeEcole"] = (id) =>
    setEcoles((prev) => prev.filter((e) => e.ecole_id !== id));

  const currentEcole = useMemo(
    () => ecoles.find((e) => e.ecole_id === currentEcoleId) ?? null,
    [ecoles, currentEcoleId],
  );

  const value: EcoleContextValue = {
    ecoles,
    currentEcoleId,
    currentEcole,
    setCurrentEcoleId,
    createEcole,
    updateEcole,
    setStatus,
    removeEcole,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEcoles() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEcoles must be used within EcoleProvider");
  return ctx;
}
