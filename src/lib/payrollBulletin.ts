export interface PayrollLineLike {
  libelle: string;
  type: string;
  base: number;
  taux: number | null;
  montant: number;
}

export interface PayrollTotalsLike {
  total_gains: number;
  total_retenues: number;
  net_a_payer: number;
  total_charges_patronales: number;
  cout_employeur: number;
  brut_imposable: number;
  base_cnps: number;
}

const centimesEgaux = (a: number, b: number) => Math.abs(a - b) < 0.5;
const somme = (lignes: PayrollLineLike[], type: string) =>
  lignes.filter((ligne) => ligne.type === type).reduce((total, ligne) => total + ligne.montant, 0);

/**
 * Contrôle les invariants comptables du bulletin avant impression.
 * Le PDF n'est jamais produit si les lignes archivées et les totaux du bulletin
 * ne racontent pas exactement la même chose.
 */
export function verifierCoherenceBulletin(
  lignes: PayrollLineLike[],
  totaux: PayrollTotalsLike,
): string[] {
  const erreurs: string[] = [];
  const valeurs = [
    ...lignes.flatMap((ligne) => [ligne.base, ligne.montant, ligne.taux ?? 0]),
    ...Object.values(totaux),
  ];
  if (valeurs.some((valeur) => !Number.isFinite(valeur))) {
    erreurs.push("Le bulletin contient une valeur non numérique.");
  }
  if (lignes.some((ligne) => ligne.base < 0 || ligne.montant < 0 || (ligne.taux ?? 0) < 0)) {
    erreurs.push("Une ligne du bulletin contient une valeur négative.");
  }
  if (Object.values(totaux).some((valeur) => valeur < 0)) {
    erreurs.push("Un total du bulletin contient une valeur négative.");
  }

  const gains = somme(lignes, "gain");
  const retenues = somme(lignes, "retenue");
  const charges = somme(lignes, "charge_patronale");
  if (!centimesEgaux(gains, totaux.total_gains)) {
    erreurs.push("Le total des gains ne correspond pas aux lignes du bulletin.");
  }
  if (!centimesEgaux(retenues, totaux.total_retenues)) {
    erreurs.push("Le total des retenues ne correspond pas aux lignes du bulletin.");
  }
  if (!centimesEgaux(charges, totaux.total_charges_patronales)) {
    erreurs.push("Le total des charges patronales ne correspond pas aux lignes du bulletin.");
  }
  if (!centimesEgaux(totaux.net_a_payer, totaux.total_gains - totaux.total_retenues)) {
    erreurs.push("Le net à payer n'est pas égal aux gains moins les retenues.");
  }
  if (!centimesEgaux(totaux.cout_employeur, totaux.total_gains + totaux.total_charges_patronales)) {
    erreurs.push("Le coût employeur n'est pas égal aux gains plus les charges patronales.");
  }
  if (totaux.brut_imposable > totaux.total_gains + 0.5) {
    erreurs.push("Le brut imposable dépasse le total des gains.");
  }
  if (totaux.base_cnps > totaux.total_gains + 0.5) {
    erreurs.push("La base CNPS dépasse le total des gains.");
  }
  return erreurs;
}

export function bornesMois(mois: number, annee: number) {
  if (!Number.isInteger(mois) || mois < 1 || mois > 12 || !Number.isInteger(annee)) {
    throw new Error("Période de paie invalide");
  }
  const debut = new Date(Date.UTC(annee, mois - 1, 1));
  const fin = new Date(Date.UTC(annee, mois, 0));
  return {
    debut: debut.toISOString().slice(0, 10),
    fin: fin.toISOString().slice(0, 10),
  };
}

/** La date de la fiche prime ; le contrat actif sert de repli explicite. */
export function choisirDateEmbauche(
  dateFiche?: string | null,
  dateDebutContrat?: string | null,
): string | null {
  return dateFiche || dateDebutContrat || null;
}
