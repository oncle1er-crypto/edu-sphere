import { supabase } from "@/integrations/supabase/client";
import { generateAttestationInscriptionPDF } from "./generateAttestationInscriptionPDF";

/**
 * Réimprime l'attestation d'inscription d'un élève à partir des données actuelles.
 * Les totaux (dû / payé) sont recalculés en direct depuis les tables `tranches`
 * et `paiements` — ils reflètent donc automatiquement une éventuelle grille
 * tarifaire personnalisée qui aurait été appliquée après l'inscription initiale.
 */
export async function reprintAttestationInscription(eleveId: string): Promise<void> {
  const { data: eleve, error } = await supabase
    .from("eleves")
    .select("*, classes(nom), annees_scolaires(libelle)")
    .eq("id", eleveId)
    .maybeSingle();
  if (error || !eleve) throw new Error(error?.message ?? "Élève introuvable");

  const [{ data: ecole }, { data: tranches }, { data: paiements }] = await Promise.all([
    supabase
      .from("ecoles")
      .select("nom, sigle, devise, adresse, telephone, email, logo_url")
      .eq("id", (eleve as any).ecole_id)
      .maybeSingle(),
    supabase.from("tranches").select("montant").eq("eleve_id", eleveId),
    supabase.from("paiements").select("montant").eq("eleve_id", eleveId),
  ]);

  const totalDu = (tranches ?? []).reduce((s: number, t: any) => s + Number(t.montant ?? 0), 0);
  const totalPaye = (paiements ?? []).reduce((s: number, p: any) => s + Number(p.montant ?? 0), 0);
  const reference = `INS-${(eleve as any).matricule}-${new Date().getFullYear()}`;

  const pdf = await generateAttestationInscriptionPDF({
    ecole: {
      nom: (ecole as any)?.nom ?? "École",
      sigle: (ecole as any)?.sigle ?? null,
      adresse: (ecole as any)?.adresse ?? null,
      telephone: (ecole as any)?.telephone ?? null,
      email: (ecole as any)?.email ?? null,
      logoUrl: (ecole as any)?.logo_url ?? null,
      devise: (ecole as any)?.devise ?? "FCFA",
    },
    eleve: {
      nom: (eleve as any).nom,
      prenom: (eleve as any).prenom,
      matricule: (eleve as any).matricule,
      date_naissance: (eleve as any).date_naissance ?? null,
      sexe: (eleve as any).sexe ?? null,
      classe: (eleve as any).classes?.nom ?? null,
      photo_url: (eleve as any).photo_url ?? null,
    },
    reference,
    annee_scolaire: (eleve as any).annees_scolaires?.libelle ?? null,
    total_du: totalDu,
    total_paye: totalPaye,
    finalise_par: null,
    date_inscription: (eleve as any).created_at ?? new Date().toISOString(),
  });
  pdf.save(`attestation-inscription-${(eleve as any).matricule}.pdf`);
}
