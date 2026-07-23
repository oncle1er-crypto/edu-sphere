import { supabase } from "@/integrations/supabase/client";
import { generateRecuPDF } from "./generateDocumentsPDF";

interface Params {
  ecoleId: string;
  factureId: string;
  /** Montant du versement à mettre en avant. Si absent, on utilise `montant_paye`. */
  montant?: number;
  reference?: string | null;
  mode?: string;
  souche?: boolean;
  /** Génère un reçu de correction (annulation/remboursement) au lieu d'un encaissement. */
  annulation?: boolean;
  /** Motif obligatoire si annulation. */
  motifAnnulation?: string | null;
  /** Date d'opération à afficher (par défaut aujourd'hui). */
  datePaiement?: string;
}

/**
 * Génère et télécharge le reçu PDF d'un paiement ou d'une annulation de facture.
 */
export async function downloadInvoiceReceipt(params: Params): Promise<void> {
  try {
    const {
      ecoleId, factureId, montant, mode = "especes", souche = true,
      annulation = false, motifAnnulation, datePaiement,
    } = params;

    const [{ data: facture }, { data: ecole }] = await Promise.all([
      supabase
        .from("factures")
        .select("id, numero, libelle, montant, montant_paye, date_emission, date_echeance, categorie, eleve_id, eleves(nom, prenom, matricule, photo_url, classes(nom))")
        .eq("id", factureId)
        .maybeSingle(),
      supabase
        .from("ecoles")
        .select("nom, sigle, devise, adresse, telephone, email, logo_url")
        .eq("id", ecoleId)
        .maybeSingle(),
    ]);

    if (!facture || !ecole) return;

    const eleve: any = (facture as any).eleves ?? {};
    const totalDu = Number(facture.montant);
    const totalPaye = Number(facture.montant_paye);
    const reference =
      params.reference ??
      (annulation
        ? `ANN-${facture.numero}-${Math.floor(Math.random() * 900 + 100)}`
        : `REC-${facture.numero}-${Math.floor(Math.random() * 900 + 100)}`);

    const montantVersement = montant ?? totalPaye;

    const catLabel =
      facture.categorie === "cantine" ? "Cantine"
      : facture.categorie === "transport" ? "Transport"
      : facture.categorie === "scolarite" ? "Scolarité"
      : String(facture.categorie ?? "Divers");

    // Période : extrait du libellé après « — » (RPC generer_factures_service)
    const rawLibelle = String(facture.libelle ?? "");
    const periode = rawLibelle.includes("—")
      ? rawLibelle.split("—").slice(1).join("—").trim()
      : rawLibelle;

    const isService = facture.categorie === "cantine" || facture.categorie === "transport";
    const titleOverride = annulation
      ? undefined
      : isService
        ? `REÇU ${catLabel.toUpperCase()}`
        : undefined;
    const subtitleOverride = annulation
      ? undefined
      : isService
        ? `Encaissement ${catLabel.toLowerCase()}`
        : undefined;

    const motifLine = annulation
      ? `ANNULATION — ${catLabel} — ${facture.libelle} (Facture ${facture.numero})`
        + (motifAnnulation ? ` · Motif : ${motifAnnulation}` : "")
      : `${catLabel} — ${facture.libelle} (Facture ${facture.numero})`;

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
      reference,
      eleve: {
        nom: eleve.nom ?? "",
        prenom: eleve.prenom ?? "",
        matricule: eleve.matricule ?? "",
        classe: eleve.classes?.nom ?? "",
        photo_url: eleve.photo_url ?? null,
      },
      montant: Number(montantVersement) || 0,
      mode,
      date_paiement: datePaiement ?? new Date().toISOString().slice(0, 10),
      total_du: totalDu,
      total_paye: totalPaye,
      total_encaisse: totalPaye,
      total_remises: 0,
      type: annulation ? "annulation" : "encaissement",
      motif: motifLine,
      souche,
      titleOverride,
      subtitleOverride,
      periode: isService ? periode : undefined,
      date_echeance: isService ? (facture as any).date_echeance ?? undefined : undefined,
    });

    const prefix = annulation ? "annulation" : "recu";
    pdf.save(`${prefix}-${facture.numero}.pdf`);
  } catch (err) {
    console.error("downloadInvoiceReceipt failed", err);
  }
}
