import { supabase } from "@/integrations/supabase/client";

/**
 * Libellés exacts des services ponctuels, indexés par référence de pièce
 * (`sp_paiements.numero` ou `sp_ventes_tenues.numero`).
 *
 * La vue `v_encaissements_detail` agrège tous les services ponctuels sous un
 * unique libellé « Services ponctuels ». Pour afficher le type exact de service
 * (tests d'entrée, macarons, tenues de sport…) dans les récapitulatifs de
 * caisse, on complète côté client via la référence, sans toucher à la vue.
 */
export async function fetchSpServiceLabels(
  ecoleId: string,
  from: string,
  to: string,
): Promise<Record<string, string>> {
  const finInclus = `${to}T23:59:59.999`;
  const labels: Record<string, string> = {};

  const [{ data: paiements }, { data: ventes }] = await Promise.all([
    (supabase as any)
      .from("sp_paiements")
      .select("numero, sp_services(nom)")
      .eq("ecole_id", ecoleId)
      .gte("date_paiement", from)
      .lte("date_paiement", finInclus),
    (supabase as any)
      .from("sp_ventes_tenues")
      .select("numero")
      .eq("ecole_id", ecoleId)
      .gte("created_at", from)
      .lte("created_at", finInclus),
  ]);

  for (const p of (paiements ?? []) as any[]) {
    if (p.numero) labels[p.numero] = p.sp_services?.nom ?? "Service non précisé";
  }
  for (const v of (ventes ?? []) as any[]) {
    if (v.numero) labels[v.numero] = "Tenues scolaires (stock)";
  }
  return labels;
}

/**
 * Noms des bénéficiaires saisis librement lors de la vente / du paiement
 * (acheteur non rattaché à un élève), indexés par référence de pièce.
 * La vue `v_encaissements_detail` n'expose que le nom d'élève : ces libellés
 * complètent les lignes « — » des récapitulatifs de caisse.
 */
export async function fetchSpBeneficiaires(
  ecoleId: string,
  from: string,
  to: string,
): Promise<Record<string, string>> {
  const finInclus = `${to}T23:59:59.999`;
  const noms: Record<string, string> = {};

  const [{ data: paiements }, { data: ventes }] = await Promise.all([
    (supabase as any)
      .from("sp_paiements")
      .select("numero, beneficiaire_libre")
      .eq("ecole_id", ecoleId)
      .gte("date_paiement", from)
      .lte("date_paiement", finInclus),
    (supabase as any)
      .from("sp_ventes_tenues")
      .select("numero, acheteur_libre")
      .eq("ecole_id", ecoleId)
      .gte("created_at", from)
      .lte("created_at", finInclus),
  ]);

  for (const p of (paiements ?? []) as any[]) {
    if (p.numero && p.beneficiaire_libre) noms[p.numero] = p.beneficiaire_libre;
  }
  for (const v of (ventes ?? []) as any[]) {
    if (v.numero && v.acheteur_libre) noms[v.numero] = v.acheteur_libre;
  }
  return noms;
}

/**
 * La vue financière renvoie parfois la chaîne « — » au lieu de NULL lorsque
 * le paiement n'est pas rattaché à un élève. Dans ce cas, utiliser le nom
 * libre retrouvé par la référence de la pièce.
 */
export function beneficiaireService(
  eleve: string | null | undefined,
  reference: string | null | undefined,
  noms: Record<string, string>,
): string {
  const nomEleve = eleve?.trim();
  if (nomEleve && nomEleve !== "—" && nomEleve !== "-") return nomEleve;

  const nomLibre = reference ? noms[reference]?.trim() : undefined;
  return nomLibre || "—";
}


export function libelleService(
  reference: string | null | undefined,
  labels: Record<string, string>,
): string {
  if (!reference) return "Service non précisé";
  return labels[reference] ?? "Service non précisé";
}

/** Sources concernées par l'éclatement par type de service. */
export function estSourceServicePonctuel(source: string) {
  return source === "services_ponctuels" || source === "ventes_tenues";
}
