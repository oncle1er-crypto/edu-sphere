import { useSyncExternalStore } from "react";
import type { EleveScolarite, Tranche } from "./scolarite-data";
import { fcfa } from "./scolarite-data";
import { buildWaveLink } from "@/lib/wavePayment";
import { normalizeSmsText } from "@/lib/smsText";

// Modèles SMS personnalisables par tranche
// Variables disponibles : {parent}, {prenom}, {nom}, {classe}, {cycle},
// {tranche}, {echeance}, {montant_du}, {reste_total}, {jours_retard}, {lien_wave}

export type TrancheKey = "T1" | "T2" | "T3" | "GENERIC";

export interface SmsTemplate {
  key: TrancheKey;
  label: string;
  message: string;
}

// v2 : ajout du lien Wave aux modèles par défaut
const KEY = "gsp-sms-templates-v2";

const DEFAULTS: Record<TrancheKey, SmsTemplate> = {
  T1: {
    key: "T1",
    label: "1ère tranche — Rentrée",
    message:
      "CS - Bonjour {parent}, la 1ère tranche de scolarité de {nom} {prenom} ({classe}) est échue depuis le {echeance}. Montant dû : {montant_du} FCFA. Payez en 1 clic via Wave : {lien_wave} puis envoyez la capture. Foi, Savoir, Excellence.",
  },
  T2: {
    key: "T2",
    label: "2ème tranche — Janvier",
    message:
      "CS - Bonjour {parent}, rappel : la 2ème tranche de scolarité de {nom} {prenom} ({classe}) était attendue le {echeance}. Montant dû : {montant_du} FCFA ({jours_retard}j de retard). Payez via Wave : {lien_wave} puis envoyez la capture.",
  },
  T3: {
    key: "T3",
    label: "3ème tranche — Avril",
    message:
      "CS - Bonjour {parent}, la 3ème tranche de scolarité de {nom} {prenom} ({classe}) est en retard depuis le {echeance}. Reste à payer : {montant_du} FCFA. Payez via Wave : {lien_wave} puis envoyez la capture.",
  },
  GENERIC: {
    key: "GENERIC",
    label: "Relance générique",
    message:
      "CS - Bonjour {parent}, rappel : {reste_total} FCFA dus pour la scolarité de {nom} {prenom} ({classe}). Payez via Wave : {lien_wave} puis envoyez la capture.",
  },
};

function load(): Record<TrancheKey, SmsTemplate> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<TrancheKey, SmsTemplate>>;
      return Object.fromEntries(
        (Object.keys(DEFAULTS) as TrancheKey[]).map((key) => [key, parsed[key] ?? DEFAULTS[key]]),
      ) as Record<TrancheKey, SmsTemplate>;
    }
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
  state = { ...state, [key]: { ...state[key], message: normalizeSmsText(message) } };
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
  // Le lien Wave est pré-rempli avec le montant exact dû par le parent
  const waveAmount = montantDu > 0 ? montantDu : e.resteDu;
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
    lien_wave: buildWaveLink(waveAmount),
  };
  return normalizeSmsText(template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`));
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
  { key: "{lien_wave}", desc: "Lien Wave pré-rempli au bon montant" },
];
