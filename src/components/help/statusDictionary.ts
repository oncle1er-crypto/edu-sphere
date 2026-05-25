import type { LegendItem } from "./StatusLegend";

/**
 * Dictionnaire central des statuts utilisés dans GSP.
 * Ajoutez ici tout nouveau statut pour le rendre cohérent partout.
 */

export const STATUTS_ELEVE: LegendItem[] = [
  {
    label: "Pré-inscrit",
    description: "Dossier ouvert mais incomplet (documents et/ou paiement manquants).",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
  {
    label: "Inscrit",
    description: "Dossier complet : documents fournis et premier paiement reçu.",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  {
    label: "Sorti",
    description: "L'élève a quitté l'établissement (départ volontaire ou fin de scolarité).",
    className: "bg-muted text-muted-foreground border-border",
  },
  {
    label: "Exclu",
    description: "Exclusion définitive prononcée par le conseil de discipline.",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
];

export const STATUTS_TRANCHE: LegendItem[] = [
  {
    label: "Due",
    description: "À payer, échéance non encore dépassée.",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  {
    label: "Partielle",
    description: "Un acompte a été versé, il reste un solde à régler.",
    className: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  {
    label: "Payée",
    description: "Tranche entièrement réglée.",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  {
    label: "Retard",
    description: "Échéance dépassée et solde non réglé.",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
];

export const STATUTS_FACTURE: LegendItem[] = [
  { label: "Brouillon", description: "Facture en préparation, non encore envoyée.", className: "bg-muted text-muted-foreground border-border" },
  { label: "Émise", description: "Facture envoyée au parent, en attente de paiement.", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { label: "Partielle", description: "Un acompte a été reçu, solde à recouvrer.", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  { label: "Payée", description: "Montant total encaissé.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { label: "En retard", description: "Échéance dépassée sans règlement complet.", className: "bg-destructive/15 text-destructive border-destructive/30" },
  { label: "Annulée", description: "Facture annulée, sans effet comptable.", className: "bg-muted text-muted-foreground border-border line-through" },
];

export const STATUTS_PRESENCE: LegendItem[] = [
  { label: "Présent", description: "L'élève était en cours à l'appel.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { label: "Absent", description: "Aucune présence enregistrée pour ce créneau.", className: "bg-destructive/15 text-destructive border-destructive/30" },
  { label: "Retard", description: "Arrivé après le début du cours.", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { label: "Justifié", description: "Absence ou retard validé par un motif accepté.", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
];

export const STATUTS_PERSONNEL: LegendItem[] = [
  { label: "Actif", description: "Membre du personnel en poste actuellement.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { label: "Suspendu", description: "Contrat temporairement gelé (congé, sanction…).", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { label: "Inactif", description: "A quitté l'établissement, conservé pour l'historique.", className: "bg-muted text-muted-foreground border-border" },
];

export const STATUTS_EMPRUNT: LegendItem[] = [
  { label: "En cours", description: "Livre prêté, à rendre avant l'échéance.", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { label: "Rendu", description: "Livre restitué dans les délais.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { label: "En retard", description: "Date de retour dépassée, livre non restitué.", className: "bg-destructive/15 text-destructive border-destructive/30" },
  { label: "Perdu", description: "Livre déclaré perdu — pénalité possible.", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
];

export const STATUTS_CARTE: LegendItem[] = [
  { label: "Active", description: "Carte valide, utilisable dans l'établissement.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { label: "En attente", description: "Carte créée, en cours d'impression ou de remise.", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { label: "Perdue", description: "Déclarée perdue par le porteur — bloquée.", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { label: "Désactivée", description: "Carte invalidée (fin d'année, exclusion, remplacement).", className: "bg-muted text-muted-foreground border-border" },
];

export const STATUTS_BULLETIN: LegendItem[] = [
  { label: "Brouillon", description: "Notes en cours de saisie, non publiées.", className: "bg-muted text-muted-foreground border-border" },
  { label: "Validé", description: "Notes vérifiées par l'enseignant principal.", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { label: "Publié", description: "Bulletin diffusé aux parents.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
];

export const STATUTS_DECISION_FIN_ANNEE: LegendItem[] = [
  { label: "Passage", description: "L'élève passe en classe supérieure.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { label: "Redoublement", description: "Reprise de la même classe l'année suivante.", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { label: "Transfert", description: "Changement d'établissement ou de filière.", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { label: "Exclusion", description: "Décision disciplinaire de renvoi définitif.", className: "bg-destructive/15 text-destructive border-destructive/30" },
];
