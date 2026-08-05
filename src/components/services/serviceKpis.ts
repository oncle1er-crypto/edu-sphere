/**
 * Agrégats financiers partagés Cantine / Transport.
 * Vocabulaire clarifié :
 *  - Facturé à ce jour : total des factures dont l'échéance est passée ou du jour.
 *  - Encaissé : sommes réellement reçues (toutes factures confondues).
 *  - En retard : reste dû sur les factures déjà échues.
 *  - À venir : factures non encore échues (non payées).
 */
export interface FactureLiteKpi {
  montant: number;
  montant_paye: number;
  date_echeance: string;
  statut?: string;
}

export interface ServiceKpis {
  factureAJour: number;
  encaisse: number;
  enRetard: number;
  aVenir: number;
  nbEnRetard: number;
  nbEcheancesDuJour: number;
}

const isActive = (f: FactureLiteKpi) => (f.statut ?? "emise") !== "annulee";

export function computeServiceKpis(factures: FactureLiteKpi[], today = new Date()): ServiceKpis {
  const jour = today.toISOString().slice(0, 10);
  let factureAJour = 0, encaisse = 0, enRetard = 0, aVenir = 0, nbEnRetard = 0, nbEcheancesDuJour = 0;

  factures.filter(isActive).forEach((f) => {
    const reste = Math.max(0, f.montant - f.montant_paye);
    encaisse += f.montant_paye;
    if (f.date_echeance <= jour) {
      factureAJour += f.montant;
      if (reste > 0) { enRetard += reste; nbEnRetard += 1; }
      if (f.date_echeance === jour && reste > 0) nbEcheancesDuJour += 1;
    } else if (reste > 0) {
      aVenir += reste;
    }
  });

  return { factureAJour, encaisse, enRetard, aVenir, nbEnRetard, nbEcheancesDuJour };
}

export const fmtF = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} F`;
