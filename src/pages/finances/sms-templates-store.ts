import { useSyncExternalStore } from "react";
import type { EleveScolarite, Tranche } from "./scolarite-data";
import { fcfa } from "./scolarite-data";

// Modèles SMS personnalisables par tranche
// Variables disponibles : {parent}, {prenom}, {nom}, {classe}, {cycle},
// {tranche}, {echeance}, {montant_du}, {reste_total}, {jours_retard}

export type TrancheKey = "T1" | "T2" | "T3" | "GENERIC";

export interface SmsTemplate {
  key: TrancheKey;
  label: string;
  message: string;
}

const KEY = "gsp-sms-templates";

const DEFAULTS: Record<TrancheKey, SmsTemplate> = {
  T1: {
    key: "T1",
    label: "1ère tranche — Rentrée",
    message:
      "GSP - Bonjour {parent}, la 1ère tranche de scolarité de {prenom} {nom} ({classe}) est échue depuis le {echeance}. Montant dû : {montant_du} FCFA. Merci de régulariser. Foi, Savoir, Excellence.",
  },
  T2: {
    key: "T2",
    label: "2ème tranche — Janvier",
    message:
      "GSP - Bonjour {parent}, rappel : la 2ème tranche de scolarité de {prenom} {nom} ({classe}) était attendue le {echeance}. Montant dû : {montant_du} FCFA ({jours_retard}j de retard). Merci de régulariser.",
  },
  T3: {
    key: "T3",
    label: "3ème tranche — Avril",
    message:
      "GSP - Bonjour {parent}, la 3ème tranche de scolarité de {prenom} {nom} ({classe}) est en retard depuis le {echeance}. Reste à payer : {montant_du} FCFA. Merci de régulariser rapidement.",
  },
  GENERIC: {
    key: "GENERIC",
    label: "Relance générique",
    message:
      "GSP - Bonjour {parent}, rappel : {reste_total} FCFA dus pour la scolarité de {prenom} {nom} ({classe}). Merci de régulariser.",
  },
};

function load(): Record<TrancheKey, SmsTemplate> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

let state: Record<TrancheKey, SmsTemplate> = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

export function updateTemplate(key: TrancheKey, message: string) {
  state = { ...state, [key]: { ...state[key], message } };
  persist();
}

export function resetTemplate(key: TrancheKey) {
  state = { ...state, [key]: { ...DEFAULTS[key] } };
  persist();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSmsTemplates(): Record<TrancheKey, SmsTemplate> {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function getTemplate(key: TrancheKey): SmsTemplate {
  return state[key];
}

// Détermine la tranche cible (la première en retard, sinon la première non-payée, sinon GENERIC)
export function pickTrancheCible(e: EleveScolarite): { key: TrancheKey; tranche?: Tranche } {
  const retard = e.tranches.find((t) => t.statut === "retard");
  if (retard) return { key: `T${retard.num}` as TrancheKey, tranche: retard };
  const partielle = e.tranches.find((t) => t.statut === "partielle");
  if (partielle) return { key: `T${partielle.num}` as TrancheKey, tranche: partielle };
  return { key: "GENERIC" };
}

export function renderTemplate(template: string, e: EleveScolarite, tranche?: Tranche): string {
  const montantDu = tranche ? Math.max(0, tranche.montant - tranche.paye) : e.resteDu;
  const vars: Record<string, string> = {
    parent: e.parent,
    prenom: e.prenom,
    nom: e.nom,
    classe: e.classe,
    cycle: e.cycle,
    tranche: tranche ? `T${tranche.num}` : "scolarité",
    echeance: tranche?.echeance ?? "—",
    montant_du: fcfa(montantDu),
    reste_total: fcfa(e.resteDu),
    jours_retard: String(e.joursRetard),
  };
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export const TEMPLATE_VARIABLES: { key: string; desc: string }[] = [
  { key: "{parent}", desc: "Nom du parent" },
  { key: "{prenom}", desc: "Prénom de l'élève" },
  { key: "{nom}", desc: "Nom de l'élève" },
  { key: "{classe}", desc: "Classe" },
  { key: "{cycle}", desc: "Cycle" },
  { key: "{tranche}", desc: "T1 / T2 / T3" },
  { key: "{echeance}", desc: "Date d'échéance" },
  { key: "{montant_du}", desc: "Montant dû sur la tranche" },
  { key: "{reste_total}", desc: "Reste annuel total" },
  { key: "{jours_retard}", desc: "Jours de retard" },
];
