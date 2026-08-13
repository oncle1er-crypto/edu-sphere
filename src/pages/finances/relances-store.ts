import { useSyncExternalStore } from "react";

export interface Relance {
  id: string;
  eleveId: string;
  date: string; // ISO
  canal: "SMS" | "Email" | "Appel";
  message: string;
  destinataire: string;
}

const KEY = "gsp-relances";

function load(): Relance[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("relances-store: lecture localStorage échouée, données de démo utilisées", e);
  }
  // Données initiales pour démo
  return [
    { id: "r1", eleveId: "3", date: "2026-04-20T10:30:00", canal: "SMS", message: "Rappel : 3ème tranche échue depuis 11 jours.", destinataire: "+225 07 44 55 66 77" },
    { id: "r2", eleveId: "3", date: "2026-04-12T09:15:00", canal: "SMS", message: "Échéance dépassée — merci de régulariser.", destinataire: "+225 07 44 55 66 77" },
    { id: "r3", eleveId: "4", date: "2026-04-15T14:20:00", canal: "Email", message: "Relance formelle — 24 jours de retard.", destinataire: "M. Mbarga" },
    { id: "r4", eleveId: "4", date: "2026-04-10T11:00:00", canal: "SMS", message: "Rappel paiement scolarité Tle C.", destinataire: "+225 01 22 33 44 55" },
    { id: "r5", eleveId: "4", date: "2026-04-02T08:30:00", canal: "Appel", message: "Appel téléphonique — promesse de paiement sous 7 jours.", destinataire: "+225 01 22 33 44 55" },
    { id: "r6", eleveId: "6", date: "2026-04-10T16:45:00", canal: "Email", message: "Relance critique — 38 jours de retard, scolarité non réglée.", destinataire: "M. Ekwalla" },
  ];
}

let state: Relance[] = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {
    console.warn("relances-store: écriture localStorage échouée", e);
  }
  listeners.forEach((l) => l());
}

export function addRelance(r: Omit<Relance, "id" | "date"> & { date?: string }) {
  const item: Relance = {
    id: `r${Date.now()}`,
    date: r.date ?? new Date().toISOString(),
    eleveId: r.eleveId,
    canal: r.canal,
    message: r.message,
    destinataire: r.destinataire,
  };
  state = [item, ...state];
  persist();
  return item;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useRelances(eleveId?: string): Relance[] {
  const snap = useSyncExternalStore(subscribe, () => state, () => state);
  if (!eleveId) return snap;
  return snap.filter((r) => r.eleveId === eleveId);
}

export function getRelancesCount(eleveId: string): number {
  return state.filter((r) => r.eleveId === eleveId).length;
}

export function getDerniereRelance(eleveId: string): Relance | undefined {
  return state.find((r) => r.eleveId === eleveId);
}

export function formatRelanceDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
