import { supabase } from "@/integrations/supabase/client";

export type PaymentModule = "scolarite" | "cantine" | "transport";

interface Params {
  ecoleId: string;
  telephone: string;            // numéro parent
  parent: string;
  nomEleve: string;
  prenomEleve: string;
  classe?: string;
  module: PaymentModule;
  montant: number;              // montant encaissé
  resteDu?: number;             // reste à payer après encaissement
  reference?: string | null;
}

const MODULE_LABEL: Record<PaymentModule, string> = {
  scolarite: "scolarité",
  cantine: "cantine",
  transport: "transport scolaire",
};

const fmt = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

/**
 * Envoie un SMS de confirmation au parent après un encaissement
 * (scolarité, cantine ou transport). Best-effort : n'interrompt pas
 * le flux principal si l'envoi échoue.
 */
export async function sendPaymentConfirmationSms(p: Params): Promise<boolean> {
  if (!p.telephone || p.telephone === "—") return false;

  const moduleLabel = MODULE_LABEL[p.module];
  const reste =
    p.resteDu !== undefined && p.resteDu > 0
      ? ` Reste à payer : ${fmt(p.resteDu)}.`
      : p.resteDu === 0
      ? " Compte soldé. Merci !"
      : "";
  const ref = p.reference ? ` Réf. ${p.reference}.` : "";
  const classe = p.classe ? ` (${p.classe})` : "";

  const message =
    `GSP - Bonjour ${p.parent}, nous accusons réception de votre paiement de ` +
    `${fmt(p.montant)} pour le ${moduleLabel} de ${p.nomEleve} ${p.prenomEleve}${classe}.${reste}${ref} ` +
    `Merci. Foi, Savoir, Excellence.`;

  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {
        ecole_id: p.ecoleId,
        destinataires: [p.telephone],
        message,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return (data?.sent ?? 0) > 0;
  } catch (err) {
    console.error("sendPaymentConfirmationSms failed", err);
    return false;
  }
}
