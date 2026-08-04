import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { CardData, CardType } from "@/pages/cartes/components/SchoolCard";
import { sortByEleve } from "@/lib/sortEleves";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export type CardStatut = "active" | "perdue" | "revoquee" | "expiree";

export interface IssuedCard extends CardData {
  id: string;
  emiseLe: string;
  statut: CardStatut;
  motifRevocation?: string;
}

interface Ctx {
  cards: IssuedCard[];
  loading: boolean;
  addCards: (cards: IssuedCard[]) => Promise<void>;
  updateCard: (id: string, patch: Partial<IssuedCard>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  setStatut: (id: string, statut: CardStatut, motif?: string) => Promise<void>;
  recomputeExpirations: () => Promise<void>;
  countsByType: Record<CardType, number>;
  refresh: () => Promise<void>;
}

const C = createContext<Ctx | null>(null);

/** Mappe une ligne DB vers IssuedCard (structure UI). */
function rowToCard(row: any, ecoleNom: string, ecoleVille?: string): IssuedCard {
  const meta = row.metadata ?? {};
  const eleve = row.eleves;
  const ens = row.enseignants;
  const annee = row.annees_scolaires;
  return {
    id: row.id,
    type: row.type as CardType,
    ecoleId: row.ecole_id,
    ecoleNom: meta.ecoleNom ?? ecoleNom,
    ecoleVille: meta.ecoleVille ?? ecoleVille,
    nom: eleve?.nom ?? ens?.nom ?? meta.nom ?? "",
    prenom: eleve?.prenom ?? ens?.prenom ?? meta.prenom ?? "",
    matricule: eleve?.matricule ?? ens?.matricule ?? meta.matricule ?? row.numero,
    classe: meta.classe,
    fonction: meta.fonction,
    formule: meta.formule,
    ligne: meta.ligne,
    arret: meta.arret,
    numLecteur: meta.numLecteur,
    motif: meta.motif,
    hote: meta.hote,
    photo: meta.photo,
    anneeScolaire: annee?.libelle ?? meta.anneeScolaire ?? "",
    validJusqu: row.date_expiration ?? meta.validJusqu ?? "",
    emiseLe: row.date_emission ?? row.created_at?.slice(0, 10) ?? "",
    statut: row.statut as CardStatut,
    motifRevocation: row.motif_revocation ?? undefined,
    couleurPrimaire: meta.couleurPrimaire,
    couleurAccent: meta.couleurAccent,
  };
}

/** Mappe IssuedCard vers payload INSERT/UPDATE DB. */
function cardToRow(c: IssuedCard, ecoleId: string) {
  const metadata: Record<string, any> = {
    ecoleNom: c.ecoleNom,
    ecoleVille: c.ecoleVille,
    classe: c.classe,
    fonction: c.fonction,
    formule: c.formule,
    ligne: c.ligne,
    arret: c.arret,
    numLecteur: c.numLecteur,
    motif: c.motif,
    hote: c.hote,
    photo: c.photo,
    anneeScolaire: c.anneeScolaire,
    validJusqu: c.validJusqu,
    couleurPrimaire: c.couleurPrimaire,
    couleurAccent: c.couleurAccent,
  };
  // Pour les types sans FK (cantine, transport, biblio, visiteur), on stocke l'identité dans metadata
  if (!["eleve", "personnel", "enseignant"].includes(c.type)) {
    metadata.nom = c.nom;
    metadata.prenom = c.prenom;
    metadata.matricule = c.matricule;
  }
  return {
    ecole_id: ecoleId,
    type: c.type as any,
    numero: c.matricule || `CARD-${Date.now()}`,
    date_emission: c.emiseLe || new Date().toISOString().slice(0, 10),
    date_expiration: c.validJusqu || null,
    statut: c.statut as any,
    motif_revocation: c.motifRevocation ?? null,
    metadata,
  };
}

export function CardsProvider({ children }: { children: ReactNode }) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [cards, setCards] = useState<IssuedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecoleInfo, setEcoleInfo] = useState<{ nom: string; ville?: string }>({ nom: "" });

  const refresh = useCallback(async () => {
    if (!ecoleId) { setCards([]); setLoading(false); return; }
    setLoading(true);
    const { data: ecole } = await supabase
      .from("ecoles")
      .select("nom, ville")
      .eq("id", ecoleId)
      .maybeSingle();
    const info = { nom: ecole?.nom ?? "", ville: ecole?.ville ?? undefined };
    setEcoleInfo(info);

    const { data, error } = await supabase
      .from("cartes")
      .select("*, eleves(nom, prenom, matricule), enseignants(nom, prenom, matricule), annees_scolaires(libelle)")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erreur chargement cartes");
      setCards([]);
    } else {
      setCards(
        sortByEleve((data ?? []) as any[], (r: any) => ({
          nom: r.eleves?.nom ?? r.enseignants?.nom,
          prenom: r.eleves?.prenom ?? r.enseignants?.prenom,
        })).map((r: any) => rowToCard(r, info.nom, info.ville))
      );
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading) refresh();
  }, [ecoleLoading, refresh]);

  const addCards = useCallback(async (newCards: IssuedCard[]) => {
    if (!ecoleId) { toast.error("École non sélectionnée"); return; }
    const rows = newCards.map((c) => cardToRow({ ...c, ecoleId }, ecoleId));
    const { error } = await supabase.from("cartes").insert(rows as any);
    if (error) { toast.error(messageErreurBase(error)); return; }
    await refresh();
  }, [ecoleId, refresh]);

  const updateCard = useCallback(async (id: string, patch: Partial<IssuedCard>) => {
    const current = cards.find((c) => c.id === id);
    if (!current || !ecoleId) return;
    const merged = { ...current, ...patch } as IssuedCard;
    const row = cardToRow(merged, ecoleId);
    const { error } = await supabase
      .from("cartes")
      .update({
        statut: row.statut,
        motif_revocation: row.motif_revocation,
        date_expiration: row.date_expiration,
        metadata: row.metadata,
      })
      .eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    setCards((s) => s.map((c) => (c.id === id ? merged : c)));
  }, [cards, ecoleId]);

  const removeCard = useCallback(async (id: string) => {
    const { error } = await supabase.from("cartes").delete().eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    setCards((s) => s.filter((c) => c.id !== id));
  }, []);

  const setStatut = useCallback(async (id: string, statut: CardStatut, motif?: string) => {
    const { error } = await supabase
      .from("cartes")
      .update({ statut: statut as any, motif_revocation: motif ?? null })
      .eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    setCards((s) => s.map((c) => (c.id === id ? { ...c, statut, motifRevocation: motif } : c)));
  }, []);

  const recomputeExpirations = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const expired = cards.filter((c) => c.statut === "active" && c.validJusqu && c.validJusqu < today);
    if (expired.length === 0) return;
    const ids = expired.map((c) => c.id);
    const { error } = await supabase
      .from("cartes")
      .update({ statut: "expiree" as any })
      .in("id", ids);
    if (error) { toast.error(messageErreurBase(error)); return; }
    setCards((s) => s.map((c) => (ids.includes(c.id) ? { ...c, statut: "expiree" as CardStatut } : c)));
  }, [cards]);

  const countsByType = useMemo(() => {
    const acc: Record<CardType, number> = {
      eleve: 0, personnel: 0, cantine: 0, transport: 0, bibliotheque: 0, visiteur: 0,
    };
    cards.forEach((c) => { if (acc[c.type] !== undefined) acc[c.type]++; });
    return acc;
  }, [cards]);

  return (
    <C.Provider value={{ cards, loading, addCards, updateCard, removeCard, setStatut, recomputeExpirations, countsByType, refresh }}>
      {children}
    </C.Provider>
  );
}

export function useCards() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}
