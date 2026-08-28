import { supabase } from "@/integrations/supabase/client";
import { generateRecuPDF, type RecuData } from "./generateDocumentsPDF";
import { stampCancelled } from "./pdfCancelStamp";
import { summarizeReceiptOperation, type ReceiptOperationLine } from "./receiptOperation";

interface Params {
  ecoleId: string;
  eleveId: string;
  paiementId: string;
  type: RecuData["type"];
  /** Inclure la souche école. Par défaut true. */
  souche?: boolean;
  /** Masquer la ligne « Versement reçu / Dont ce versement ». */
  hideVersementLine?: boolean;
}

interface OperationParams extends Omit<Params, "paiementId"> {
  paiementIds: string[];
}

interface PaiementReceiptRow {
  id: string;
  reference: string | null;
  montant: number;
  mode: string;
  motif: string | null;
  date_paiement: string;
  created_at: string;
  tranche_id: string | null;
  annule_le: string | null;
  motif_annulation: string | null;
  tranches: { numero: number; label: string } | null;
}

/**
 * Récupère les données du paiement + école + élève et construit le PDF reçu.
 */
async function buildReceiptPdfForPayments({
  ecoleId,
  eleveId,
  paiementIds,
  type,
  souche = true,
  hideVersementLine,
}: OperationParams) {
  const ids = Array.from(new Set(paiementIds.filter(Boolean)));
  if (ids.length === 0) return null;

  // 1) Récupère l'année scolaire active de l'élève pour scoper les cumuls
  const { data: eleveScope } = await supabase
    .from("eleves")
    .select("annee_id")
    .eq("id", eleveId)
    .maybeSingle();
  const anneeId = (eleveScope as any)?.annee_id ?? null;

  const tranchesQ = anneeId
    ? supabase
        .from("tranches")
        .select("id, montant, paye, frais_scolarite!inner(annee_id)")
        .eq("ecole_id", ecoleId)
        .eq("eleve_id", eleveId)
        .eq("frais_scolarite.annee_id", anneeId)
    : supabase
        .from("tranches")
        .select("id, montant, paye")
        .eq("ecole_id", ecoleId)
        .eq("eleve_id", eleveId);

  const [{ data: paiementsSelectionnes }, { data: ecole }, { data: eleve }, { data: tranches }] =
    await Promise.all([
      supabase.from("paiements")
        .select("id, reference, montant, mode, motif, date_paiement, created_at, tranche_id, annule_le, motif_annulation, tranches(numero,label)")
        .eq("ecole_id", ecoleId)
        .eq("eleve_id", eleveId)
        .in("id", ids)
        .order("created_at", { ascending: true }),
      supabase.from("ecoles")
        .select("nom, sigle, devise, adresse, telephone, email, logo_url")
        .eq("id", ecoleId).maybeSingle(),
      supabase.from("eleves")
        .select("nom, prenom, matricule, photo_url, classes(nom)")
        .eq("id", eleveId).maybeSingle(),
      tranchesQ,
    ]);

  if (!paiementsSelectionnes || paiementsSelectionnes.length !== ids.length || !ecole || !eleve) return null;

  const lignes = paiementsSelectionnes as unknown as PaiementReceiptRow[];
  const summary = summarizeReceiptOperation(lignes.map((paiement): ReceiptOperationLine => ({
    id: paiement.id,
    montant: Number(paiement.montant),
    mode: paiement.mode,
    reference: paiement.reference,
    date_paiement: paiement.date_paiement,
    tranche_numero: paiement.tranches?.numero ?? null,
    tranche_label: paiement.tranches?.label ?? null,
  })));
  const paiement = lignes[0];
  const cutoff = lignes.reduce(
    (latest, item) => item.created_at > latest ? item.created_at : latest,
    lignes[0].created_at,
  );

  // Total dû = somme des montants des tranches de l'année active (grille override incluse).
  const totalDu = (tranches ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);

  // Les cumuls d'un duplicata sont arrêtés au moment de l'opération imprimée.
  // Ils restent ainsi fidèles au document historique et excluent les annulations.
  const trancheIds = new Set<string>((tranches ?? []).map((t: any) => t.id));
  const { data: paiementsRaw } = await supabase
    .from("paiements")
    .select("montant, mode, tranche_id, created_at")
    .eq("ecole_id", ecoleId)
    .eq("eleve_id", eleveId)
    .is("annule_le", null)
    .lte("created_at", cutoff);
  const REMISE_MODES = new Set(["remise", "bourse", "prise_en_charge"]);
  let totalEncaisse = 0;
  let totalRemises = 0;
  (paiementsRaw ?? []).forEach((p: any) => {
    // Les règlements de factures de services (cantine, transport, tenues…) ont un
    // `tranche_id` null : ils sont volontairement exclus des cumuls de scolarité.
    if (anneeId && trancheIds.size > 0 && (!p.tranche_id || !trancheIds.has(p.tranche_id))) return;
    const m = Number(p.montant || 0);
    if (REMISE_MODES.has(p.mode)) totalRemises += m;
    else totalEncaisse += m;
  });
  const totalPaye = totalEncaisse + totalRemises;

  const pdf = await generateRecuPDF({
    ecole: {
      nom: ecole.nom || "École",
      sigle: ecole.sigle || "",
      devise: ecole.devise || "",
      adresse: ecole.adresse || "",
      telephone: ecole.telephone || "",
      email: ecole.email || "",
      logoUrl: ecole.logo_url || null,
    },
    reference: summary.reference ?? paiement.id.slice(0, 8).toUpperCase(),
    eleve: {
      nom: eleve.nom,
      prenom: eleve.prenom,
      matricule: eleve.matricule ?? "",
      classe: (eleve as any).classes?.nom ?? "",
      photo_url: eleve.photo_url ?? null,
    },
    montant: summary.montant,
    mode: summary.mode,
    date_paiement: summary.datePaiement,
    total_du: totalDu,
    total_paye: totalPaye,
    total_encaisse: totalEncaisse,
    total_remises: totalRemises,
    type,
    motif: summary.motif ?? paiement.motif ?? null,
    souche,
    hideVersementLine,
  });

  // Reçu d'un paiement annulé : on imprime un filigrane « ANNULÉ » rouge.
  if (lignes.every((item) => item.annule_le)) {
    stampCancelled(pdf, lignes[lignes.length - 1].annule_le);
  }

  return {
    pdf,
    paiement: {
      ...paiement,
      reference: summary.reference,
      montant: summary.montant,
      mode: summary.mode,
      date_paiement: summary.datePaiement,
    },
    eleve: {
      nom: eleve.nom,
      prenom: eleve.prenom,
    },
  };
}

export async function buildReceiptPdf(params: Params) {
  const { paiementId, ...rest } = params;
  return buildReceiptPdfForPayments({ ...rest, paiementIds: [paiementId] });
}

/** Construit un reçu unique pour toutes les lignes d'un même encaissement ventilé. */
export async function buildReceiptOperationPdf(params: OperationParams) {
  return buildReceiptPdfForPayments(params);
}

function filenameFor(type: RecuData["type"], reference: string): string {
  const prefix =
    type === "encaissement" ? "recu" :
    type === "bourse" ? "bourse" :
    type === "prise_en_charge" ? "prise-en-charge" : "remise";
  return `${prefix}-${reference}.pdf`;
}

/**
 * Re-fetch a freshly-created paiement + ecole + élève and download the matching receipt PDF.
 * Returns silently on failure (best-effort companion of a successful RPC).
 */
export async function downloadReceiptFor(params: Params): Promise<void> {
  try {
    const built = await buildReceiptPdf(params);
    if (!built) return;
    const ref = built.paiement.reference ?? built.paiement.id.slice(0, 8);
    built.pdf.save(filenameFor(params.type, ref));
  } catch (err) {
    console.error("downloadReceiptFor failed", err);
  }
}

/** Télécharge un reçu global limité aux lignes du même encaissement ventilé. */
export async function downloadReceiptOperationFor(params: OperationParams): Promise<boolean> {
  try {
    const built = await buildReceiptOperationPdf(params);
    if (!built) return false;
    const ref = built.paiement.reference ?? built.paiement.id.slice(0, 8);
    built.pdf.save(filenameFor(params.type, ref));
    return true;
  } catch (err) {
    console.error("downloadReceiptOperationFor failed", err);
    return false;
  }
}

/**
 * Génère le reçu PDF SANS la souche école puis le partage via WhatsApp.
 * Utilise l'API Web Share si disponible (mobile + WhatsApp Business installé)
 * pour permettre la sélection directe du destinataire dans WhatsApp.
 * Sinon : télécharge le PDF + ouvre wa.me avec un message pré-rempli pour
 * que l'utilisateur joigne manuellement le fichier téléchargé.
 */
export async function shareReceiptWhatsApp(
  params: Params & { telephone?: string | null }
): Promise<"shared" | "fallback" | "error"> {
  try {
    const built = await buildReceiptPdf({ ...params, souche: false });
    if (!built) return "error";

    const ref = built.paiement.reference ?? built.paiement.id.slice(0, 8);
    const filename = filenameFor(params.type, ref);
    const blob = built.pdf.output("blob");
    const file = new File([blob], filename, { type: "application/pdf" });

    const caption =
      `Reçu de paiement — ${built.eleve.nom} ${built.eleve.prenom}\n` +
      `Réf. ${ref}\nMerci de votre confiance.`;

    // Web Share API (mobile : ouvre directement WhatsApp Business / WhatsApp avec le fichier)
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
      try {
        await nav.share({
          files: [file],
          title: filename,
          text: caption,
        });
        return "shared";
      } catch (e: any) {
        if (e?.name === "AbortError") return "shared";
        // sinon on tombe sur le fallback
      }
    }

    // Fallback desktop : on télécharge le PDF puis on ouvre wa.me
    built.pdf.save(filename);
    const tel = (params.telephone || "").replace(/[^\d+]/g, "");
    const waUrl = tel
      ? `https://wa.me/${tel.replace(/^\+/, "")}?text=${encodeURIComponent(caption + "\n\n(Pièce jointe : " + filename + " — joindre le fichier qui vient d'être téléchargé.)")}`
      : `https://web.whatsapp.com/`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    return "fallback";
  } catch (err) {
    console.error("shareReceiptWhatsApp failed", err);
    return "error";
  }
}
