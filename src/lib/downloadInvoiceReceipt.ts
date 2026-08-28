import { supabase } from "@/integrations/supabase/client";
import { generateRecuPDF } from "./generateDocumentsPDF";
import { serviceReceiptExpiry } from "./invoiceReceipt";

export interface Params {
  ecoleId: string;
  factureId: string;
  /** Paiement exact à reproduire. Sans identifiant, le dernier paiement actif est utilisé. */
  paiementId?: string;
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
 * Construit le reçu PDF d'un paiement (ou annulation) de facture.
 * Retourne le PDF et les données utiles (facture, élève, référence).
 */
export async function buildInvoiceReceiptPdf(params: Params) {
  {
    const {
      ecoleId, factureId, paiementId, montant, mode, souche = true,
      annulation = false, motifAnnulation, datePaiement,
    } = params;

    let paiementQuery = supabase
      .from("paiements")
      .select("id, montant, mode, reference, date_paiement, annule_le")
      .eq("facture_id", factureId);
    paiementQuery = paiementId
      ? paiementQuery.eq("id", paiementId)
      : paiementQuery.is("annule_le", null)
          .order("date_paiement", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);

    const [factureResult, ecoleResult, paiementResult] = await Promise.all([
      supabase
        .from("factures")
        .select("id, numero, libelle, montant, montant_paye, date_emission, date_echeance, date_fin_validite, categorie, eleve_id, eleves(nom, prenom, matricule, photo_url, classes(nom))")
        .eq("id", factureId)
        .maybeSingle(),
      supabase
        .from("ecoles")
        .select("nom, sigle, devise, adresse, telephone, email, logo_url")
        .eq("id", ecoleId)
        .maybeSingle(),
      paiementQuery.maybeSingle(),
    ]);

    if (factureResult.error) throw factureResult.error;
    if (ecoleResult.error) throw ecoleResult.error;
    if (paiementResult.error) throw paiementResult.error;

    const facture = factureResult.data;
    const ecole = ecoleResult.data;
    const paiement = paiementResult.data;

    if (!facture || !ecole) return;

    const eleve: any = (facture as any).eleves ?? {};
    const totalDu = Number(facture.montant);
    const totalPaye = Number(facture.montant_paye);
    const reference =
      params.reference ??
      (annulation
        ? `ANN-${facture.numero}-${Math.floor(Math.random() * 900 + 100)}`
        : paiement?.reference ?? `REC-${facture.numero}-${Math.floor(Math.random() * 900 + 100)}`);

    const montantVersement = montant ?? (paiement ? Number(paiement.montant) : totalPaye);
    const modeEffectif = mode ?? paiement?.mode ?? "especes";
    const today = new Date().toISOString().slice(0, 10);
    const datePaiementEffective = datePaiement ?? (annulation ? today : paiement?.date_paiement ?? today);

    const catLabel =
      facture.categorie === "cantine" ? "Cantine"
      : facture.categorie === "transport" ? "Transport"
      : facture.categorie === "scolarite" ? "Scolarité"
      : String(facture.categorie ?? "Divers");

    const isService = facture.categorie === "cantine" || facture.categorie === "transport";

    // ── Période concernée : nombre de mois payés ─────────────────────────────
    // Récupère la périodicité (mensuel/trimestriel) via l'abonnement de l'élève,
    // puis dérive prix mensuel = montant tranche / (1 si mensuel, 3 si trimestriel).
    // Nombre de mois payés = round(versement / prix mensuel).
    let periode: string | undefined;
    if (isService) {
      const table = facture.categorie === "cantine" ? "abonnements_cantine" : "abonnements_transport";
      const { data: ab } = await supabase
        .from(table as any)
        .select("grille_tarifs_services(periodicite)")
        .eq("ecole_id", ecoleId)
        .eq("eleve_id", (facture as any).eleve_id)
        .limit(1)
        .maybeSingle();
      const periodicite = (ab as any)?.grille_tarifs_services?.periodicite ?? "mensuel";
      const moisParTranche = periodicite === "trimestriel" ? 3 : 1;
      const prixMensuel = Number(facture.montant) / moisParTranche;
      const nbMois = prixMensuel > 0
        ? Math.max(1, Math.round(Number(montantVersement) / prixMensuel))
        : moisParTranche;
      periode = `${nbMois} mois payé${nbMois > 1 ? "s" : ""}`;
    }

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
      mode: modeEffectif,
      date_paiement: datePaiementEffective,
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
      date_echeance: serviceReceiptExpiry(facture),
      date_echeance_label: isService ? "Fin de validité" : undefined,
    });

    return {
      pdf,
      reference,
      numero: facture.numero,
      libelle: facture.libelle,
      categorie: catLabel,
      eleveId: (facture as any).eleve_id as string | null,
      eleveNom: String(eleve.nom ?? ""),
      elevePrenom: String(eleve.prenom ?? ""),
      montant: Number(montantVersement) || 0,
      annulation,
    };
  }
}

/**
 * Génère et télécharge le reçu PDF d'un paiement ou d'une annulation de facture.
 */
export async function downloadInvoiceReceipt(params: Params): Promise<boolean> {
  try {
    const built = await buildInvoiceReceiptPdf(params);
    if (!built) return false;
    const prefix = built.annulation ? "annulation" : "recu";
    built.pdf.save(`${prefix}-${built.numero}.pdf`);
    return true;
  } catch (err) {
    console.error("downloadInvoiceReceipt failed", err);
    return false;
  }
}
