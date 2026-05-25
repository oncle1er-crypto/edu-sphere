import { supabase } from "@/integrations/supabase/client";
import { generateRecuPDF, type RecuData } from "./generateDocumentsPDF";

interface Params {
  ecoleId: string;
  eleveId: string;
  paiementId: string;
  type: RecuData["type"];
}

/**
 * Re-fetch a freshly-created paiement + ecole + élève and download the matching receipt PDF.
 * Returns silently on failure (best-effort companion of a successful RPC).
 */
export async function downloadReceiptFor({ ecoleId, eleveId, paiementId, type }: Params): Promise<void> {
  try {
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

    if (!paiement || !ecole || !eleve) return;

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
    });

    const prefix = type === "encaissement" ? "recu" : type === "bourse" ? "bourse" : type === "prise_en_charge" ? "prise-en-charge" : "remise";
    pdf.save(`${prefix}-${paiement.reference ?? paiement.id.slice(0, 8)}.pdf`);
  } catch (err) {
    console.error("downloadReceiptFor failed", err);
  }
}
