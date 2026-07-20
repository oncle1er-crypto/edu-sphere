import { supabase } from "@/integrations/supabase/client";
import { generateRecuPDF } from "./generateDocumentsPDF";

interface Params {
  ecoleId: string;
  factureId: string;
  /** Montant du versement à mettre en avant. Si absent, on utilise `montant_paye` (réimpression / situation). */
  montant?: number;
  /** Référence du reçu à afficher. Si absente, on prend celle du dernier paiement lié, sinon un identifiant court. */
  reference?: string | null;
  /** Mode de règlement (especes, wave, ...). Par défaut « especes ». */
  mode?: string;
  souche?: boolean;
}

/**
 * Génère et télécharge le reçu PDF d'un paiement de facture (cantine / transport / autre).
 * Réutilise le template `generateRecuPDF` pour rester graphiquement cohérent avec les reçus de scolarité.
 */
export async function downloadInvoiceReceipt(params: Params): Promise<void> {
  try {
    const { ecoleId, factureId, montant, mode = "especes", souche = true } = params;

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
    // Reference : soit celle fournie, soit un id court basé sur le n° de facture.
    const reference =
      params.reference ??
      (`REC-${facture.numero}-${Math.floor(Math.random() * 900 + 100)}`);

    const montantVersement = montant ?? totalPaye;

    const catLabel =
      facture.categorie === "cantine" ? "Cantine"
      : facture.categorie === "transport" ? "Transport"
      : facture.categorie === "scolarite" ? "Scolarité"
      : String(facture.categorie ?? "Divers");

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
      date_paiement: new Date().toISOString().slice(0, 10),
      total_du: totalDu,
      total_paye: totalPaye,
      total_encaisse: totalPaye,
      total_remises: 0,
      type: "encaissement",
      motif: `${catLabel} — ${facture.libelle} (Facture ${facture.numero})`,
      souche,
    });

    pdf.save(`recu-${facture.numero}.pdf`);
  } catch (err) {
    console.error("downloadInvoiceReceipt failed", err);
  }
}
