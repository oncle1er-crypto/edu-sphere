import { supabase } from "@/integrations/supabase/client";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export type ZinduaUsage = "test" | "relance" | "echeance" | "bulletin";

export interface CibleWhatsApp {
  /** Numéro au format ivoirien (+225… ou 10 chiffres). */
  to: string;
  /** Variables du modèle Zindua propres à ce destinataire. */
  variables?: Record<string, string>;
  /** Texte utilisé si le repli SMS est activé. */
  sms?: string;
}

export interface ResultatEnvoi {
  destinataire: string;
  canal: "whatsapp" | "sms" | null;
  ok: boolean;
  detail?: string;
  code?: string;
}

export interface RetourEnvoiWhatsApp {
  total: number;
  envoyes: number;
  echecs: number;
  whatsapp: number;
  sms: number;
  resultats: ResultatEnvoi[];
}

export interface OptionsEnvoiWhatsApp {
  ecoleId: string;
  usage: ZinduaUsage;
  destinataires: (string | CibleWhatsApp)[];
  /** Variables communes du modèle. */
  variables?: Record<string, string>;
  /** Modèle Zindua imposé (sinon celui configuré pour l'usage). */
  template?: string;
  /** Texte SMS commun pour le repli. */
  sms?: string;
  /** Basculer en SMS (YellikaSMS) si WhatsApp est indisponible. */
  fallbackSms?: boolean;
}

/** Nombre maximal de destinataires par appel (cadence WhatsApp imposée par Zindua). */
export const ZINDUA_MAX_DESTINATAIRES = 10;

/**
 * Envoi WhatsApp via Zindua (modèles approuvés), avec repli SMS facultatif.
 * Toute la logique fournisseur reste côté serveur : aucune clé API n'est exposée.
 */
export async function envoyerWhatsAppZindua(
  opts: OptionsEnvoiWhatsApp,
): Promise<RetourEnvoiWhatsApp> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp-zindua", {
    body: {
      ecole_id: opts.ecoleId,
      usage: opts.usage,
      template: opts.template,
      destinataires: opts.destinataires,
      variables: opts.variables,
      sms: opts.sms,
      fallback_sms: opts.fallbackSms ?? false,
    },
  });

  if (error) {
    let detail: string | null = null;
    const ctx = (error as { context?: { text?: () => Promise<string> } }).context;
    if (ctx?.text) {
      try {
        const raw = await ctx.text();
        detail = (JSON.parse(raw)?.error as string) ?? raw;
      } catch {
        detail = null;
      }
    }
    throw new Error(detail || messageErreurBase(error) || "Échec de l'envoi WhatsApp.");
  }
  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as RetourEnvoiWhatsApp;
}

/** Premier message d'échec exploitable, pour affichage utilisateur. */
export function premierEchec(retour: RetourEnvoiWhatsApp): string | null {
  return retour.resultats.find((r) => !r.ok)?.detail ?? null;
}
