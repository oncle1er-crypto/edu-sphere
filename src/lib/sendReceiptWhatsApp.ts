import { supabase } from "@/integrations/supabase/client";
import { buildReceiptOperationPdf, buildReceiptPdf } from "@/lib/downloadReceipt";
import { buildInvoiceReceiptPdf } from "@/lib/downloadInvoiceReceipt";
import { envoyerWhatsAppZindua, premierEchec } from "@/lib/sendWhatsAppZindua";
import type { RecuData } from "@/lib/generateDocumentsPDF";

const LIEN_VALIDITE_SECONDES = 60 * 60 * 24 * 30; // 30 jours

export interface EnvoiRecuParams {
  ecoleId: string;
  eleveId: string;
  paiementId: string;
  /** Toutes les lignes techniques du même encaissement ventilé. */
  paiementIds?: string[];
  type: RecuData["type"];
  /** Numéro du parent (format ivoirien). */
  telephone: string;
  /** Nom affiché du parent. */
  parent: string;
  nomEleve: string;
  prenomEleve: string;
  montant: number;
  reference?: string | null;
  /** Libellé du service concerné (scolarité, cantine, transport…). */
  objet?: string;
}

export interface EnvoiRecuResultat {
  ok: boolean;
  canal: "whatsapp" | "sms" | null;
  detail?: string;
  lien?: string;
}

const fmt = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

/**
 * Génère le reçu PDF (sans souche école), le dépose dans le bucket privé `recus`,
 * crée un lien signé de 30 jours et l'envoie au parent par WhatsApp (Zindua),
 * avec repli SMS automatique. Best-effort : n'interrompt jamais l'encaissement.
 */
export async function envoyerRecuWhatsApp(p: EnvoiRecuParams): Promise<EnvoiRecuResultat> {
  try {
    // 1) Envoi automatique activé ?
    const { data: cfg } = await supabase
      .from("zindua_config")
      .select("envoi_auto_recu, enabled, whatsapp_enabled")
      .eq("ecole_id", p.ecoleId)
      .maybeSingle();
    if (cfg && (cfg as { envoi_auto_recu?: boolean }).envoi_auto_recu === false) {
      return { ok: false, canal: null, detail: "Envoi automatique du reçu désactivé." };
    }

    // 2) PDF sans souche école (destiné au parent)
    const operationIds = Array.from(new Set((p.paiementIds ?? [p.paiementId]).filter(Boolean)));
    const built = operationIds.length > 1
      ? await buildReceiptOperationPdf({
          ecoleId: p.ecoleId,
          eleveId: p.eleveId,
          paiementIds: operationIds,
          type: p.type,
          souche: false,
        })
      : await buildReceiptPdf({
          ecoleId: p.ecoleId,
          eleveId: p.eleveId,
          paiementId: operationIds[0] ?? p.paiementId,
          type: p.type,
          souche: false,
        });
    if (!built) return { ok: false, canal: null, detail: "Reçu introuvable." };

    const ref = built.paiement.reference ?? p.reference ?? built.paiement.id.slice(0, 8).toUpperCase();
    const blob = built.pdf.output("blob") as Blob;
    const chemin = `${p.ecoleId}/${operationIds.length > 1 ? "operation-" : ""}${p.paiementId}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("recus")
      .upload(chemin, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) return { ok: false, canal: null, detail: upErr.message };

    const { data: signe } = await supabase.storage
      .from("recus")
      .createSignedUrl(chemin, LIEN_VALIDITE_SECONDES);
    const lien = signe?.signedUrl ?? "";
    if (!lien) return { ok: false, canal: null, detail: "Lien du reçu indisponible." };

    // 3) Message WhatsApp (modèle « reçu de paiement ») + repli SMS
    const eleve = `${p.nomEleve} ${p.prenomEleve}`.trim();
    const objet = p.objet ?? "scolarité";
    // Le texte doit reprendre le montant réellement présent dans le PDF, jamais
    // un montant fourni séparément par l'interface.
    const montant = fmt(Number(built.paiement.montant));
    const sms =
      `GSP - Bonjour ${p.parent}, votre paiement de ${montant} (${objet}) pour ${eleve} ` +
      `est enregistre. Recu ref. ${ref} : ${lien}`;

    const retour = await envoyerWhatsAppZindua({
      ecoleId: p.ecoleId,
      usage: "recu",
      fallbackSms: true,
      destinataires: [
        {
          to: p.telephone,
          sms,
          variables: {
            parent: p.parent,
            eleve,
            objet,
            montant,
            reference: String(ref),
            lien,
            url: lien,
          },
        },
      ],
    });

    const r = retour.resultats[0];
    return {
      ok: retour.envoyes > 0,
      canal: r?.canal ?? null,
      detail: retour.envoyes > 0 ? undefined : premierEchec(retour) ?? "Envoi du reçu impossible.",
      lien,
    };
  } catch (err) {
    console.error("envoyerRecuWhatsApp failed", err);
    return {
      ok: false,
      canal: null,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface EnvoiRecuFactureParams {
  ecoleId: string;
  factureId: string;
  paiementId?: string;
  montant: number;
  mode?: string;
  reference?: string | null;
  datePaiement?: string;
  telephone: string;
  parent: string;
}

/**
 * Même principe que `envoyerRecuWhatsApp`, pour un reçu de facture de service
 * (cantine, transport, scolarité facturée).
 */
export async function envoyerRecuFactureWhatsApp(
  p: EnvoiRecuFactureParams,
): Promise<EnvoiRecuResultat> {
  try {
    const { data: cfg } = await supabase
      .from("zindua_config")
      .select("envoi_auto_recu")
      .eq("ecole_id", p.ecoleId)
      .maybeSingle();
    if (cfg && (cfg as { envoi_auto_recu?: boolean }).envoi_auto_recu === false) {
      return { ok: false, canal: null, detail: "Envoi automatique du reçu désactivé." };
    }

    const built = await buildInvoiceReceiptPdf({
      ecoleId: p.ecoleId,
      factureId: p.factureId,
      paiementId: p.paiementId,
      montant: p.montant,
      mode: p.mode,
      reference: p.reference ?? null,
      datePaiement: p.datePaiement,
      souche: false,
    });
    if (!built) return { ok: false, canal: null, detail: "Facture introuvable." };

    const blob = built.pdf.output("blob") as Blob;
    const chemin = `${p.ecoleId}/facture-${p.factureId}-${built.reference}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("recus")
      .upload(chemin, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) return { ok: false, canal: null, detail: upErr.message };

    const { data: signe } = await supabase.storage
      .from("recus")
      .createSignedUrl(chemin, LIEN_VALIDITE_SECONDES);
    const lien = signe?.signedUrl ?? "";
    if (!lien) return { ok: false, canal: null, detail: "Lien du reçu indisponible." };

    const eleve = `${built.eleveNom} ${built.elevePrenom}`.trim();
    const objet = built.categorie.toLowerCase();
    const montant = fmt(built.montant);
    const sms =
      `GSP - Bonjour ${p.parent}, votre paiement de ${montant} (${objet}) pour ${eleve} ` +
      `est enregistre. Recu ref. ${built.reference} : ${lien}`;

    const retour = await envoyerWhatsAppZindua({
      ecoleId: p.ecoleId,
      usage: "recu",
      fallbackSms: true,
      destinataires: [
        {
          to: p.telephone,
          sms,
          variables: {
            parent: p.parent,
            eleve,
            objet,
            montant,
            reference: String(built.reference),
            lien,
            url: lien,
          },
        },
      ],
    });

    const r = retour.resultats[0];
    return {
      ok: retour.envoyes > 0,
      canal: r?.canal ?? null,
      detail: retour.envoyes > 0 ? undefined : premierEchec(retour) ?? "Envoi du reçu impossible.",
      lien,
    };
  } catch (err) {
    console.error("envoyerRecuFactureWhatsApp failed", err);
    return { ok: false, canal: null, detail: err instanceof Error ? err.message : String(err) };
  }
}
