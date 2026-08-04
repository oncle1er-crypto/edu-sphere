/**
 * Traduction des erreurs techniques de la base de données en messages
 * lisibles par le personnel administratif (secrétariat, comptabilité).
 * Aucune logique métier ici : uniquement de l'affichage.
 */

const fmt = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("fr-FR") : String(v ?? "");
};

/** Messages déjà rédigés en français par la base : on les laisse passer tels quels. */
const PREFIXES_FR = [
  "Surpaiement interdit",
  "Tranche",
  "Motif",
  "Accès refusé",
  "Paiement introuvable",
  "Facture introuvable",
  "Seul un administrateur",
];

type Regle = { code: string; build: (p: string[]) => string };

const REGLES: Regle[] = [
  {
    code: "classe_pleine",
    build: (p) =>
      `La classe ${p[0]} est complète (${fmt(p[1])} élèves inscrits sur ${fmt(p[2])} places). Augmentez sa capacité ou choisissez une autre classe.`,
  },
  {
    code: "capacite_inferieure_effectif",
    build: (p) =>
      `Impossible de fixer la capacité de ${p[0]} à ${fmt(p[2])} : ${fmt(p[1])} élèves y sont déjà inscrits. Transférez des élèves avant de réduire la capacité.`,
  },
  {
    code: "facture_avec_reglement_actif",
    build: (p) => `La facture ${p[0]} porte encore un règlement de ${fmt(p[1])} FCFA. Annulez d'abord ce règlement.`,
  },
  { code: "montant_tranche_sous_paye", build: () => "Le montant de cette tranche ne peut pas être inférieur à ce qui a déjà été versé." },
  { code: "montant_depasse_reste", build: (p) => `Le montant dépasse le reste dû, qui est de ${fmt(p[0])} FCFA.` },
  { code: "montant_depasse_tranche", build: () => "Le montant dépasse ce qu'il reste à payer sur cette tranche." },
  { code: "montant_depasse_facture", build: () => "Le montant dépasse le reste dû de cette facture." },
  { code: "rien_a_encaisser", build: () => "Il n'y a plus rien à encaisser pour cet élève." },
  { code: "multi_frais_non_supporte", build: () => "Cet élève a des tranches sur plusieurs grilles tarifaires. Contactez l'administrateur." },
  { code: "tranche_posterieure_payee", build: (p) => `Annulez d'abord les encaissements de la tranche T${p[0]}.` },
  { code: "paiement_annule_non_modifiable", build: () => "Un paiement annulé ne peut plus être modifié." },
  { code: "deja_annule", build: () => "Cette opération a déjà été annulée." },
  { code: "paiement_facture", build: () => "Utilisez l'écran Factures pour ce paiement." },
  { code: "bulletin_non_valide", build: () => "Validez le bulletin avant de le payer." },
  { code: "bulletin_deja_paye", build: () => "Ce bulletin est déjà payé." },
  { code: "budget_deja_genere", build: (p) => `Un budget existe déjà pour cette année (${fmt(p[0])} lignes).` },
  { code: "motif_requis", build: () => "Le motif est obligatoire (5 caractères minimum)." },
  { code: "not_authorized", build: () => "Vous n'avez pas les droits nécessaires pour cette opération." },
  { code: "not_authenticated", build: () => "Session expirée. Reconnectez-vous." },
  { code: "zindua_desactive", build: () => "L'envoi Zindua est désactivé." },
  { code: "canal_whatsapp_desactive", build: () => "Le canal WhatsApp est désactivé." },
  { code: "destinataire_non_autorise_en_test", build: () => "En mode test, ce numéro n'est pas autorisé à recevoir de message." },
  { code: "quota_mensuel_atteint", build: () => "Quota mensuel de messages atteint." },
  { code: "cadence_trop_rapide", build: () => "Trop d'envois rapprochés. Patientez quelques secondes." },
];

/** Traduit une erreur Supabase/PostgreSQL en message utilisateur en français. */
export function messageErreurBase(error: unknown, fallback?: string): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  if (!raw.trim()) return fallback ?? "Une erreur est survenue.";

  if (PREFIXES_FR.some((p) => raw.trim().startsWith(p))) return raw.trim();

  for (const regle of REGLES) {
    // Le code peut être préfixé par du texte PostgreSQL ("... raise exception: code:param")
    const re = new RegExp(`${regle.code}((?::[^\\s:]*)*)`, "i");
    const m = raw.match(re);
    if (m) {
      const params = m[1] ? m[1].split(":").slice(1) : [];
      return regle.build(params);
    }
  }

  return fallback ?? raw;
}
