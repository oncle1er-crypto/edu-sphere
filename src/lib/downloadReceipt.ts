import { supabase } from "@/integrations/supabase/client";
import { generateRecuPDF, type RecuData } from "./generateDocumentsPDF";

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

/**
 * Récupère les données du paiement + école + élève et construit le PDF reçu.
 */
async function buildReceiptPdf({ ecoleId, eleveId, paiementId, type, souche = true }: Params) {
  const [{ data: paiement }, { data: ecole }, { data: eleve }, { data: tranches }, { data: paiements }] =
    await Promise.all([
      supabase.from("paiements")
        .select("id, reference, montant, mode, motif, date_paiement")
        .eq("id", paiementId).maybeSingle(),
      supabase.from("ecoles")
        .select("nom, sigle, devise, adresse, telephone, email, logo_url")
        .eq("id", ecoleId).maybeSingle(),
      supabase.from("eleves")
        .select("nom, prenom, matricule, photo_url, classes(nom)")
        .eq("id", eleveId).maybeSingle(),
      supabase.from("tranches").select("montant").eq("ecole_id", ecoleId).eq("eleve_id", eleveId),
      supabase.from("paiements").select("montant").eq("ecole_id", ecoleId).eq("eleve_id", eleveId),
    ]);

  if (!paiement || !ecole || !eleve) return null;

  const totalDu = (tranches ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);
  const totalPaye = (paiements ?? []).reduce((s: number, p: any) => s + Number(p.montant || 0), 0);

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
    reference: paiement.reference ?? paiement.id.slice(0, 8).toUpperCase(),
    eleve: {
      nom: eleve.nom,
      prenom: eleve.prenom,
      matricule: eleve.matricule ?? "",
      classe: (eleve as any).classes?.nom ?? "",
      photo_url: eleve.photo_url ?? null,
    },
    montant: Number(paiement.montant),
    mode: paiement.mode,
    date_paiement: paiement.date_paiement,
    total_du: totalDu,
    total_paye: totalPaye,
    type,
    motif: paiement.motif ?? null,
    souche,
  });

  return {
    pdf,
    paiement,
    eleve: {
      nom: eleve.nom,
      prenom: eleve.prenom,
    },
  };
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
