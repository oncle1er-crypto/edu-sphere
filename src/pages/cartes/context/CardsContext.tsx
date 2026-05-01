import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { CardData, CardType } from "@/pages/cartes/components/SchoolCard";

export type CardStatut = "active" | "perdue" | "revoquee" | "expiree";

export interface IssuedCard extends CardData {
  id: string;
  emiseLe: string;     // ISO
  statut: CardStatut;
  motifRevocation?: string;
}

interface Ctx {
  cards: IssuedCard[];
  addCards: (cards: IssuedCard[]) => void;
  updateCard: (id: string, patch: Partial<IssuedCard>) => void;
  removeCard: (id: string) => void;
  setStatut: (id: string, statut: CardStatut, motif?: string) => void;
  /** Met à jour le statut "expiree" sur les cartes dépassées. */
  recomputeExpirations: () => void;
  /** Statistiques par type. */
  countsByType: Record<CardType, number>;
}

const C = createContext<Ctx | null>(null);
const STORAGE = "lovable.cards.v1";

const seedAnnee = "2025-2026";
const validJusqu = "2026-07-31";

const seed: IssuedCard[] = [
  {
    id: "card_1", type: "eleve",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "MBALLA", prenom: "Junior", matricule: "EL-2451", classe: "3ème A",
    anneeScolaire: seedAnnee, validJusqu,
    emiseLe: "2025-09-15", statut: "active",
  },
  {
    id: "card_2", type: "eleve",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "NGUEMO", prenom: "Sarah", matricule: "EL-2452", classe: "3ème A",
    anneeScolaire: seedAnnee, validJusqu,
    emiseLe: "2025-09-15", statut: "active",
  },
  {
    id: "card_3", type: "personnel",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "DIALLO", prenom: "Aïssatou", matricule: "ENS-042", fonction: "Professeure de Mathématiques",
    anneeScolaire: seedAnnee, validJusqu,
    emiseLe: "2025-09-01", statut: "active",
  },
  {
    id: "card_4", type: "cantine",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "TCHOUMI", prenom: "Paul", matricule: "EL-2453", classe: "5ème B",
    formule: "Demi-pensionnaire",
    anneeScolaire: seedAnnee, validJusqu,
    emiseLe: "2025-09-20", statut: "active",
  },
  {
    id: "card_5", type: "transport",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "ATANGANA", prenom: "Léa", matricule: "EL-2454", ligne: "Ligne 3 — Yoff",
    arret: "Arrêt École Primaire",
    anneeScolaire: seedAnnee, validJusqu,
    emiseLe: "2025-09-22", statut: "active",
  },
  {
    id: "card_6", type: "bibliotheque",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "KAMGA", prenom: "Yves", matricule: "EL-2455", numLecteur: "LEC-128",
    anneeScolaire: seedAnnee, validJusqu,
    emiseLe: "2025-10-05", statut: "active",
  },
  {
    id: "card_7", type: "visiteur",
    ecoleId: "ec_001", ecoleNom: "Groupe Scolaire Les Lauriers", ecoleVille: "Dakar",
    nom: "BAKARY", prenom: "Ousmane", matricule: "VIS-0421", motif: "Réunion parents",
    hote: "Mme Diop (Direction)",
    anneeScolaire: seedAnnee, validJusqu: new Date().toISOString().slice(0, 10),
    emiseLe: new Date().toISOString().slice(0, 10), statut: "active",
  },
];

function load(): IssuedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
}

export function CardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<IssuedCard[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(cards));
  }, [cards]);

  const addCards: Ctx["addCards"] = (newCards) => setCards((s) => [...newCards, ...s]);
  const updateCard: Ctx["updateCard"] = (id, patch) =>
    setCards((s) => s.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCard: Ctx["removeCard"] = (id) => setCards((s) => s.filter((c) => c.id !== id));
  const setStatut: Ctx["setStatut"] = (id, statut, motif) =>
    updateCard(id, { statut, motifRevocation: motif });

  const recomputeExpirations: Ctx["recomputeExpirations"] = () => {
    const today = new Date().toISOString().slice(0, 10);
    setCards((s) =>
      s.map((c) =>
        c.statut === "active" && c.validJusqu < today ? { ...c, statut: "expiree" as CardStatut } : c
      )
    );
  };

  const countsByType = useMemo(() => {
    const acc: Record<CardType, number> = {
      eleve: 0, personnel: 0, cantine: 0, transport: 0, bibliotheque: 0, visiteur: 0,
    };
    cards.forEach((c) => { acc[c.type]++; });
    return acc;
  }, [cards]);

  return (
    <C.Provider value={{ cards, addCards, updateCard, removeCard, setStatut, recomputeExpirations, countsByType }}>
      {children}
    </C.Provider>
  );
}

export function useCards() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}
