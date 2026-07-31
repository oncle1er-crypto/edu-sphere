/**
 * Ventilation de la scolarité par poste.
 *
 * Composition du total annuel dû par un élève :
 *   1. Frais d'inscription / réinscription  (paramétrable, défaut 25 000 F)
 *   2. Frais annexes                        (uniformes & fournitures + activités extrascolaires)
 *   3. Frais de scolarité                   = total − inscription − annexes
 *
 * Ordre de priorité d'affectation des encaissements :
 *   Inscription → Scolarité → Annexes
 * (les frais annexes ne commencent à être alimentés que lorsque l'inscription
 *  ET la scolarité sont soldées)
 */

export interface VentilationParams {
  fraisInscription: number;
  fraisUniformes: number;
  fraisActivites: number;
}

export const VENTILATION_DEFAULTS: VentilationParams = {
  fraisInscription: 25000,
  fraisUniformes: 15000,
  fraisActivites: 15000,
};

export interface PosteVentilation {
  cle: "inscription" | "scolarite" | "annexes";
  label: string;
  du: number;
  affecte: number;
  reste: number;
  solde: boolean;
}

export interface Ventilation {
  postes: PosteVentilation[];
  detailAnnexes: { label: string; du: number; affecte: number; reste: number }[];
  totalDu: number;
  totalAffecte: number;
  reste: number;
}

/**
 * Répartit `montantCouvert` (versements + remises) sur les postes, dans l'ordre
 * de priorité inscription → scolarité → annexes.
 */
export function ventilerScolarite(
  totalDu: number,
  montantCouvert: number,
  params: VentilationParams = VENTILATION_DEFAULTS,
): Ventilation {
  const total = Math.max(0, Number(totalDu) || 0);
  const annexesDu = Math.max(0, (Number(params.fraisUniformes) || 0) + (Number(params.fraisActivites) || 0));
  const inscriptionDu = Math.min(Math.max(0, Number(params.fraisInscription) || 0), total);
  const annexes = Math.min(annexesDu, Math.max(0, total - inscriptionDu));
  const scolariteDu = Math.max(0, total - inscriptionDu - annexes);

  let reste = Math.max(0, Math.min(Number(montantCouvert) || 0, total));

  const take = (du: number) => {
    const a = Math.min(du, reste);
    reste -= a;
    return a;
  };

  const aInscription = take(inscriptionDu);
  const aScolarite = take(scolariteDu);
  const aAnnexes = take(annexes);

  const mk = (
    cle: PosteVentilation["cle"],
    label: string,
    du: number,
    affecte: number,
  ): PosteVentilation => ({
    cle,
    label,
    du,
    affecte,
    reste: Math.max(0, du - affecte),
    solde: affecte >= du,
  });

  // Détail des frais annexes, au prorata de l'affectation reçue (uniformes d'abord)
  let restAnnexe = aAnnexes;
  const uni = Math.min(Math.max(0, Number(params.fraisUniformes) || 0), annexes);
  const act = Math.max(0, annexes - uni);
  const aUni = Math.min(uni, restAnnexe);
  restAnnexe -= aUni;
  const aAct = Math.min(act, restAnnexe);

  const totalAffecte = aInscription + aScolarite + aAnnexes;

  return {
    postes: [
      mk("inscription", "Frais d'inscription / réinscription", inscriptionDu, aInscription),
      mk("scolarite", "Frais de scolarité", scolariteDu, aScolarite),
      mk("annexes", "Frais annexes", annexes, aAnnexes),
    ],
    detailAnnexes: [
      { label: "Uniformes & fournitures", du: uni, affecte: aUni, reste: Math.max(0, uni - aUni) },
      { label: "Activités extrascolaires", du: act, affecte: aAct, reste: Math.max(0, act - aAct) },
    ],
    totalDu: total,
    totalAffecte,
    reste: Math.max(0, total - totalAffecte),
  };
}
