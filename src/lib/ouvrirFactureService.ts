import { supabase } from "@/integrations/supabase/client";

export interface FactureOuverte {
  id: string; numero: string; libelle: string;
  montant: number; montant_paye: number; ecole_id: string; categorie: string;
}

/**
 * Ouvre (si besoin) la 1ʳᵉ échéance d'un abonnement service puis retourne
 * la facture la plus ancienne non soldée, prête à être encaissée.
 */
export async function ouvrirEtRecupererFacture(params: {
  ecoleId: string;
  abonnementId: string;
  serviceType: "cantine" | "transport";
  eleveId: string;
}): Promise<FactureOuverte | null> {
  const { ecoleId, abonnementId, serviceType, eleveId } = params;
  await supabase.rpc("generer_factures_service" as any, {
    _ecole_id: ecoleId,
    _abonnement_id: abonnementId,
    _service_type: serviceType,
    _forcer: true,
  });

  const { data } = await supabase
    .from("factures")
    .select("id, numero, libelle, montant, montant_paye, ecole_id, categorie")
    .eq("ecole_id", ecoleId)
    .eq("categorie", serviceType)
    .eq("eleve_id", eleveId)
    .neq("statut", "annulee")
    .order("date_echeance")
    .limit(20);

  const fac = ((data ?? []) as any[]).find((f) => Number(f.montant_paye) < Number(f.montant));
  if (!fac) return null;
  return {
    id: fac.id, numero: fac.numero, libelle: fac.libelle,
    montant: Number(fac.montant), montant_paye: Number(fac.montant_paye),
    ecole_id: fac.ecole_id, categorie: fac.categorie,
  };
}
